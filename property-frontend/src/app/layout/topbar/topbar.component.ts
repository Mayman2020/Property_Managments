import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AsyncPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { AppNotification } from '../../core/models/notification.model';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService, LanguageOption } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SnackService } from '../../core/services/snack.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, AsyncPipe, DatePipe, UpperCasePipe, RouterLink, TranslateModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() pageTitle = '';
  @Input() sidebarCollapsed = false;
  @Output() sidebarToggle = new EventEmitter<void>();
  notifications: AppNotification[] = [];
  unreadCount = 0;
  private pollSub?: Subscription;

  constructor(
    readonly theme: ThemeService,
    readonly i18n: I18nService,
    readonly auth: AuthService,
    private readonly notificationService: NotificationService,
    private readonly router: Router,
    private readonly snack: SnackService
  ) {}

  get currentUser() { return this.auth.getCurrentUser(); }
  get currentUserDisplayName(): string {
    const u = this.currentUser;
    if (!u) return '';
    const ar = (u.fullNameAr ?? '').trim();
    const en = (u.fullNameEn ?? '').trim();
    const fallback = (u.fullName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback)
      : (en || ar || fallback);
  }
  get roleKey(): string {
    const role = this.auth.getRole();
    return role ? `ROLE.${role}` : '';
  }
  get switchableRoles(): UserRole[] {
    return this.auth.getEffectiveRoles();
  }
  isRoleActive(role: UserRole): boolean {
    return this.auth.getRole() === role;
  }
  get languages(): LanguageOption[] { return this.i18n.languages; }
  get activeLanguage(): LanguageOption {
    return this.languages.find((l) => l.code === this.i18n.currentLang) ?? this.languages[0];
  }
  languageLabel(lang: LanguageOption): string { return lang.label; }
  languageNativeLabel(lang: LanguageOption): string { return lang.nativeLabel; }

  ngOnInit(): void {
    this.pollSub = timer(0, 30000).subscribe(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  switchLang(lang: LanguageOption): void { this.i18n.setLang(lang.code).subscribe(); }
  toggleTheme(): void { this.theme.toggle(); }
  logout(): void { this.auth.logout(); }
  switchRole(role: UserRole): void {
    if (this.isRoleActive(role)) return;
    this.auth.setActiveRole(role);
    void this.router.navigateByUrl(this.auth.getDashboardRoute()).then(() => {
      window.location.reload();
    });
  }

  profileRoute(): string {
    const role = this.auth.getRole();
    if (
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER' ||
      role === 'PROPERTY_GUARD' ||
      role === 'PROCEDURES_CLERK'
    ) {
      return '/admin/profile';
    }
    if (role === 'MAINTENANCE_OFFICER' || role === 'MAINTENANCE_CONTRACTOR') return '/officer/profile';
    if (role === 'TENANT') return '/tenant/profile';
    return '/auth/login';
  }

  markAsRead(notification: AppNotification): void {
    if (!notification.read) {
      this.notificationService.markRead(notification.id).subscribe(() => {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
    void this.router.navigateByUrl(this.notificationsInboxRoute());
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
      this.unreadCount = 0;
      this.snack.success(this.i18n.instant('NOTIFICATIONS.MARK_ALL_READ_SUCCESS'));
    });
  }

  notificationIcon(notification: AppNotification): string {
    if (notification.type.includes('REQUEST')) return 'construction';
    if (notification.type.includes('RENT') || notification.type.includes('PAYMENT') || notification.type.includes('FINANCE')) return 'payments';
    if (notification.type.includes('CONTRACT')) return 'description';
    if (notification.type.includes('UNIT')) return 'apartment';
    if (notification.type.includes('TENANT')) return 'person';
    if (notification.type.includes('OWNER')) return 'account_balance';
    return 'notifications';
  }

  /** Resolved title (i18n keys from backend or stored bilingual title). */
  notificationDropdownTitle(notification: AppNotification): string {
    const fromParams = this.translateFromParams(notification.params?.titleKey, notification.params?.vars);
    if (fromParams) {
      return fromParams;
    }
    const raw = notification.title ?? '';
    const single = this.i18n.pickBilingualSegment(raw, 'title');
    if (raw.includes(' | ')) {
      return single || this.i18n.instant('NOTIFICATIONS.GENERAL');
    }
    const translated = this.i18n.instant(`NOTIFICATIONS.${notification.type}`);
    if (translated && translated !== `NOTIFICATIONS.${notification.type}`) {
      return translated;
    }
    if (this.i18n.currentLang === 'en') {
      return single || this.i18n.instant('NOTIFICATIONS.GENERAL');
    }
    if (this.hasArabic(single)) {
      return single;
    }
    return single || this.i18n.instant('NOTIFICATIONS.GENERAL');
  }

  /** Short secondary line: localized body snippet or generic teaser. */
  notificationDropdownHint(notification: AppNotification): string {
    const fromBody = this.translateFromParams(notification.params?.bodyKey, notification.params?.vars);
    if (fromBody) {
      return this.clampOneLine(fromBody, 120);
    }
    const raw = notification.message ?? '';
    const bodySep = '\n\n—\n\n';
    const msg = raw.includes(bodySep) ? this.i18n.pickBilingualSegment(raw, 'body') : raw.trim();
    if (msg) {
      return this.clampOneLine(msg, 120);
    }
    return this.i18n.instant('NOTIFICATIONS.DROPDOWN_TEASER');
  }

  private clampOneLine(raw: string, max: number): string {
    const t = raw.replace(/\s+/g, ' ').trim();
    if (t.length <= max) {
      return t;
    }
    return `${t.slice(0, Math.max(1, max - 1))}…`;
  }

  private translateFromParams(key: string | undefined, vars: Record<string, unknown> | undefined): string {
    if (!key) {
      return '';
    }
    const resolved = this.i18n.instant(key, vars as Record<string, string | number> | undefined);
    return resolved && resolved !== key ? resolved : '';
  }

  private hasArabic(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }

  private loadNotifications(): void {
    this.notificationService.getMy({ page: 0, size: 8, scope: 'recent' }).subscribe({
      next: (res) => { this.notifications = res.data?.content ?? []; },
      error: () => {}
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => { this.unreadCount = res.data?.unreadCount ?? 0; },
      error: () => {}
    });
  }

  /** Admin-area roles use the shared notifications inbox; others fall back to the dashboard. */
  private notificationsInboxRoute(): string {
    const role = this.auth.getRole();
    if (
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER' ||
      role === 'PROPERTY_GUARD' ||
      role === 'PROCEDURES_CLERK'
    ) {
      return '/admin/notifications';
    }
    if (role === 'TENANT') {
      return '/tenant/notifications';
    }
    return this.auth.getDashboardRoute();
  }
}
