import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
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
import { PermissionService } from '../../core/services/permission.service';
import { ScopedPropertyService } from '../../core/services/scoped-property.service';
import { PropertyService, Property } from '../../core/services/property.service';
import { resolveNotificationBodyLine, resolveNotificationTitle } from '../../core/utils/notification-display.util';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, AsyncPipe, DatePipe, UpperCasePipe, RouterLink, TranslateModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule, MatFormFieldModule, MatSelectModule],
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
  private unreadSyncSub?: Subscription;
  propertyOptions: Property[] = [];
  selectedPropertyId: number | null = null;

  constructor(
    readonly theme: ThemeService,
    readonly i18n: I18nService,
    readonly auth: AuthService,
    private readonly permissions: PermissionService,
    private readonly notificationService: NotificationService,
    private readonly scopedProperty: ScopedPropertyService,
    private readonly propertyService: PropertyService,
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
  showPropertySelector(): boolean {
    const scope = this.scopedProperty.scopeValue;
    return !!scope && !scope.unrestricted && scope.propertyIds.length > 1;
  }
  propertyLabel(p: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
    return `${p.propertyCode || ''}${p.propertyCode ? ' — ' : ''}${name || p.id}`;
  }

  ngOnInit(): void {
    this.scopedProperty.propertyScope.subscribe((scope) => {
      this.selectedPropertyId = this.scopedProperty.selectedPropertyIdValue;
      if (!scope || scope.unrestricted || scope.propertyIds.length <= 1) {
        this.propertyOptions = [];
        return;
      }
      this.loadPropertyOptions(scope.propertyIds);
    });
    this.scopedProperty.selectedPropertyId.subscribe((id) => {
      this.selectedPropertyId = id;
    });
    this.scopedProperty.refreshScope();

    this.pollSub = timer(0, 30000).subscribe(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    });
    this.unreadSyncSub = this.notificationService.unreadCount$.subscribe((count) => {
      if (count == null) return;
      this.unreadCount = count;
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.unreadSyncSub?.unsubscribe();
  }

  switchLang(lang: LanguageOption): void { this.i18n.setLang(lang.code).subscribe(); }
  toggleTheme(): void { this.theme.toggle(); }
  logout(): void { this.auth.logout(); }
  onPropertyScopeChange(id: number): void {
    this.scopedProperty.setSelectedPropertyId(id);
    void this.router.navigateByUrl(this.router.url);
  }
  switchRole(role: UserRole): void {
    if (this.isRoleActive(role)) return;
    this.auth.setActiveRole(role);
    this.scopedProperty.refreshScope();
    this.permissions.loadMine().subscribe({
      next: () => {
        void this.router.navigateByUrl(this.auth.getDashboardRoute());
      },
      error: () => {
        void this.router.navigateByUrl(this.auth.getDashboardRoute());
      }
    });
  }

  private loadPropertyOptions(ids: number[]): void {
    this.propertyService.getAll(0, Math.max(200, ids.length), '').subscribe({
      next: (res) => {
        const rows = res.data?.content ?? [];
        const order = new Map(ids.map((id, i) => [id, i]));
        this.propertyOptions = rows
          .filter((p) => ids.includes(p.id))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      },
      error: () => {
        this.propertyOptions = [];
      }
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
    if (
      role === 'MAINTENANCE_OFFICER_INTERNAL' ||
      role === 'MAINTENANCE_OFFICER_COMPANY' ||
      role === 'MAINTENANCE_COMPANY'
    )
      return '/officer/profile';
    if (role === 'TENANT') return '/tenant/profile';
    return '/auth/login';
  }

  markAsRead(notification: AppNotification): void {
    if (!notification.read) {
      this.notificationService.markRead(notification.id).subscribe(() => {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.notificationService.setUnreadCount(this.unreadCount);
      });
    }
    void this.router.navigateByUrl(this.notificationsInboxRoute());
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
      this.unreadCount = 0;
      this.notificationService.setUnreadCount(0);
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

  /** Resolved title (i18n keys from backend, NOTIFICATIONS.TYPES.<type>, or stored bilingual title). */
  notificationDropdownTitle(notification: AppNotification): string {
    return resolveNotificationTitle(this.i18n, notification);
  }

  /** Short secondary line: localized body snippet or generic teaser. */
  notificationDropdownHint(notification: AppNotification): string {
    return (
      resolveNotificationBodyLine(this.i18n, notification, 120) ||
      this.i18n.instant('NOTIFICATIONS.DROPDOWN_TEASER')
    );
  }

  private loadNotifications(): void {
    this.notificationService.getMy({ page: 0, size: 8, scope: 'all' }).subscribe({
      next: (res) => { this.notifications = res.data?.content ?? []; },
      error: () => {}
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount = res.data?.unreadCount ?? 0;
        this.notificationService.setUnreadCount(this.unreadCount);
      },
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
