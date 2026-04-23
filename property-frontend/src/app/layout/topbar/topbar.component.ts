import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
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

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, AsyncPipe, UpperCasePipe, RouterLink, TranslateModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule],
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
  get roleKey(): string {
    const role = this.currentUser?.role;
    return role ? `ROLE.${role}` : '';
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

  profileRoute(): string {
    const role = this.currentUser?.role;
    if (role === 'SUPER_ADMIN' || role === 'PROPERTY_ADMIN') return '/admin/profile';
    if (role === 'MAINTENANCE_OFFICER') return '/officer/profile';
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
    void this.router.navigateByUrl(this.notificationRoute(notification));
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
      this.unreadCount = 0;
      this.snack.success(this.i18n.instant('NOTIFICATIONS.MARK_ALL_READ_SUCCESS'));
    });
  }

  private loadNotifications(): void {
    this.notificationService.getMy({ page: 0, size: 8 }).subscribe({
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

  private notificationRoute(notification: AppNotification): string {
    const requestId = notification.requestId;
    const role = this.currentUser?.role;
    if (!requestId) return this.auth.getDashboardRoute();
    if (role === 'SUPER_ADMIN' || role === 'PROPERTY_ADMIN') return `/admin/maintenance/${requestId}`;
    if (role === 'MAINTENANCE_OFFICER') return `/officer/requests/${requestId}`;
    if (role === 'TENANT') return `/tenant/requests/${requestId}`;
    return this.auth.getDashboardRoute();
  }
}
