import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, TranslateModule, MatButtonModule, PageHeaderComponent],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'NAV.NOTIFICATIONS' | translate"
        [title]="'NOTIFICATIONS.TITLE' | translate"
        [subtitle]="'NOTIFICATIONS.SUBTITLE' | translate">
        <button mat-stroked-button type="button" (click)="markAllRead()">{{ 'NOTIFICATIONS.MARK_ALL_READ' | translate }}</button>
      </app-page-header>

      <div class="app-card notifications-card">
        <div class="notification-list" *ngIf="notifications.length; else emptyTpl">
          <button
            type="button"
            class="notification-row"
            *ngFor="let item of notifications"
            [class.unread]="!item.read"
            (click)="open(item)">
            <span class="notification-icon material-icons">{{ notificationIcon(item) }}</span>
            <span class="notification-copy">
              <span class="notification-row-head">
                <strong>{{ notificationTitle(item) }}</strong>
                <span class="status-badge" [attr.data-status]="item.read ? 'ACTIVE' : 'PENDING'">
                  {{ (item.read ? 'NOTIFICATIONS.READ' : 'NOTIFICATIONS.NEW') | translate }}
                </span>
              </span>
              <span class="notification-message">{{ notificationMessage(item) }}</span>
              <span class="notification-time">{{ item.createdAt | date:'dd/MM/yyyy' }}</span>
            </span>
            <span class="app-icon-btn accent notification-open"><span class="material-icons">arrow_forward</span></span>
          </button>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="app-empty-state">
          <span class="material-icons empty-icon">notifications_none</span>
          <h4>{{ 'NOTIFICATIONS.EMPTY' | translate }}</h4>
          <p>{{ 'NOTIFICATIONS.EMPTY_MSG' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .notifications-card { overflow: hidden; }
    .notification-list { display: grid; }
    .notification-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 16px 18px;
      border: 0;
      border-bottom: 1px solid var(--line-2);
      background: var(--surface);
      color: inherit;
      text-align: start;
      cursor: pointer;
      transition: background var(--t-fast);
    }
    .notification-row:last-child { border-bottom: 0; }
    .notification-row:hover,
    .notification-row.unread { background: rgba(200, 154, 61, 0.08); }
    .notification-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: var(--paper-2);
      color: var(--amber-700);
      font-size: 22px;
    }
    .notification-copy { display: grid; gap: 6px; min-width: 0; }
    .notification-row-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .notification-row-head strong { color: var(--text-main); font-size: 0.95rem; }
    .notification-message { color: var(--text-muted); line-height: 1.6; overflow-wrap: anywhere; }
    .notification-time { color: var(--text-subtle); font-size: 0.78rem; }
    .notification-open { pointer-events: none; }
    [dir='rtl'] .notification-open .material-icons { transform: rotate(180deg); }
    @media (max-width: 640px) {
      .notification-row { grid-template-columns: auto minmax(0, 1fr); }
      .notification-open { display: none; }
    }
  `]
})
export class NotificationsPageComponent implements OnInit {
  notifications: AppNotification[] = [];

  constructor(
    private readonly service: NotificationService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.service.getMy({ page: 0, size: 100 }).subscribe({
      next: (res) => { this.notifications = res.data?.content ?? []; },
      error: () => { this.notifications = []; }
    });
  }

  markAllRead(): void {
    this.service.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map((item) => ({ ...item, read: true }));
    });
  }

  open(item: AppNotification): void {
    const role = this.auth.getRole();
    if (!item.read) {
      this.service.markRead(item.id).subscribe();
    }
    if (item.requestId) {
      if (role === 'MAINTENANCE_OFFICER') {
        void this.router.navigateByUrl(`/officer/requests/${item.requestId}`);
        return;
      }
      if (role === 'TENANT') {
        void this.router.navigateByUrl(`/tenant/requests/${item.requestId}`);
        return;
      }
      void this.router.navigateByUrl(`/admin/maintenance/${item.requestId}`);
      return;
    }
    void this.router.navigateByUrl(this.auth.getDashboardRoute());
  }

  notificationTitle(notification: AppNotification): string {
    if (!this.i18n.isRtl) return notification.title;
    const translated = this.i18n.instant(`NOTIFICATIONS.${notification.type}`);
    if (translated && translated !== `NOTIFICATIONS.${notification.type}`) return translated;
    if (this.hasArabic(notification.title)) return notification.title;
    return this.i18n.instant('NOTIFICATIONS.GENERAL');
  }

  notificationMessage(notification: AppNotification): string {
    if (!this.i18n.isRtl) return notification.message;
    if (this.hasArabic(notification.message)) return notification.message;

    const requestNo = this.extractRequestNo(notification.message);
    const requestText = requestNo ? ` ${requestNo}` : '';
    switch (notification.type) {
      case 'REQUEST_CREATED':
        return `تم إنشاء طلب الصيانة${requestText}.`;
      case 'REQUEST_ASSIGNED':
        return notification.title === 'Work started'
          ? `بدأ مسؤول الصيانة العمل على طلب الصيانة${requestText}.`
          : `تم تعيين طلب الصيانة${requestText}.`;
      case 'REQUEST_SCHEDULED':
        return `تمت جدولة زيارة لطلب الصيانة${requestText}${this.extractAfter(notification.message, ' on ') ? ` بتاريخ ${this.extractAfter(notification.message, ' on ')}` : ''}.`;
      case 'REQUEST_SCHEDULE_ACCEPTED':
        return `قبل المستأجر موعد الزيارة لطلب الصيانة${requestText}.`;
      case 'REQUEST_SCHEDULE_REJECTED':
        return `رفض المستأجر موعد الزيارة لطلب الصيانة${requestText}${this.extractAfter(notification.message, 'Note: ') ? `، الملاحظة: ${this.extractAfter(notification.message, 'Note: ')}` : ''}.`;
      case 'REQUEST_VISIT_REPORTED':
        return `تم إرسال تقرير الزيارة لطلب الصيانة${requestText}.`;
      case 'REQUEST_COMPLETED':
        return `تم إتمام طلب الصيانة${requestText}.`;
      case 'REQUEST_RATED':
        return `تم إرسال تقييم لطلب الصيانة${requestText}.`;
      case 'REQUEST_CANCELLED':
        return `تم إلغاء طلب الصيانة${requestText}.`;
      case 'FINANCE_ALERT':
        return 'يوجد تنبيه مالي جديد يحتاج إلى المتابعة.';
      case 'OWNER_STATEMENT':
        return 'تم إصدار كشف حساب جديد للمالك.';
      case 'PAYMENT_RECEIVED':
        return 'تم تسجيل دفعة جديدة.';
      case 'RENT_DUE':
        return 'يوجد إيجار مستحق قريباً.';
      case 'RENT_OVERDUE':
        return 'يوجد إيجار متأخر.';
      case 'CONTRACT_EXPIRING':
        return 'يوجد عقد يقترب من تاريخ الانتهاء.';
      case 'CONTRACT_ACTIVATED':
        return 'تم تفعيل عقد جديد.';
      case 'PAYROLL_GENERATED':
        return 'تم إنشاء مسير الرواتب.';
      default:
        return notification.message || this.i18n.instant('NOTIFICATIONS.GENERAL_MESSAGE');
    }
  }

  notificationIcon(notification: AppNotification): string {
    if (notification.type.includes('REQUEST')) return 'construction';
    if (notification.type.includes('RENT') || notification.type.includes('PAYMENT') || notification.type.includes('FINANCE')) return 'payments';
    if (notification.type.includes('CONTRACT')) return 'description';
    if (notification.type.includes('OWNER')) return 'account_balance';
    return 'notifications';
  }

  private extractRequestNo(message: string): string {
    return message.match(/MR-\d{4}-\d{5}/)?.[0] ?? '';
  }

  private extractAfter(message: string, token: string): string {
    const index = message.indexOf(token);
    return index >= 0 ? message.slice(index + token.length).trim() : '';
  }

  private hasArabic(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }
}
