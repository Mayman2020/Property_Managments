import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models/notification.model';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { resolveNotificationTargetUrl } from '../../../core/utils/notification-navigation.util';
import { resolveNotificationBodyLine, resolveNotificationTitle } from '../../../core/utils/notification-display.util';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    TranslateModule,
    MatButtonModule,
    MatTooltipModule,
    MatTabsModule,
    MatPaginatorModule,
    PageHeaderComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'NAV.NOTIFICATIONS' | translate"
        [title]="'NOTIFICATIONS.TITLE' | translate"
        [subtitle]="'NOTIFICATIONS.SUBTITLE' | translate">
        <button mat-stroked-button type="button" (click)="markAllRead()">{{ 'NOTIFICATIONS.MARK_ALL_READ' | translate }}</button>
      </app-page-header>

      <mat-tab-group
        class="notify-scope-tabs"
        animationDuration="0ms"
        [selectedIndex]="tabIndex"
        (selectedIndexChange)="onTabChange($event)">
        <mat-tab [label]="'NOTIFICATIONS.TAB_RECENT' | translate"></mat-tab>
        <mat-tab [label]="'NOTIFICATIONS.TAB_OLDER' | translate"></mat-tab>
      </mat-tab-group>

      <div class="app-card notifications-card">
        <ng-container *ngIf="notifications.length; else emptyTpl">
          <div class="notification-list">
            <button
              type="button"
              class="notification-row"
              *ngFor="let item of notifications"
              [class.unread]="!item.read"
              [class.from-complaint]="item.params?.fromComplaint"
              (click)="open(item)">
              <span class="notification-icon material-icons"
                [class.complaint-origin-icon]="item.params?.fromComplaint">{{ notificationIcon(item) }}</span>
              <span class="notification-copy">
                <span class="notification-row-head">
                  <strong>{{ notificationTitle(item) }}</strong>
                  <span class="status-badge" [attr.data-status]="item.read ? 'ACTIVE' : 'PENDING'">
                    {{ (item.read ? 'NOTIFICATIONS.READ' : 'NOTIFICATIONS.NEW') | translate }}
                  </span>
                </span>
                <span class="notification-message">{{ notificationMessage(item) }}</span>
                <span class="notification-meta">
                  {{ 'NOTIFICATIONS.BY' | translate }} {{ notificationActor(item) }}
                  <span aria-hidden="true">•</span>
                  {{ 'NOTIFICATIONS.DATE' | translate }} {{ item.createdAt | date:'dd/MM/yyyy' }}
                  <span aria-hidden="true">•</span>
                  {{ 'NOTIFICATIONS.TIME' | translate }} {{ item.createdAt | date:'HH:mm' }}
                </span>
              </span>
              <span class="app-icon-btn accent notification-open" [matTooltip]="'NOTIFICATIONS.OPEN_LINK' | translate"><span class="material-icons">arrow_forward</span></span>
            </button>
          </div>
          <mat-paginator
            class="notifications-paginator"
            [length]="totalElements"
            [pageSize]="pageSize"
            [pageIndex]="pageIndex"
            [pageSizeOptions]="[pageSize]"
            [hidePageSize]="true"
            [showFirstLastButtons]="true"
            (page)="onPage($event)">
          </mat-paginator>
        </ng-container>
      </div>

      <ng-template #emptyTpl>
        <div class="app-card notifications-empty-card">
          <div class="app-empty-state">
            <span class="material-icons empty-icon">notifications_none</span>
            <h4>{{ 'NOTIFICATIONS.EMPTY' | translate }}</h4>
            <p>{{ 'NOTIFICATIONS.EMPTY_TAB_HINT' | translate }}</p>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .notify-scope-tabs ::ng-deep .mat-mdc-tab-body-wrapper {
      display: none;
    }
    .notifications-card { overflow: hidden; margin-top: 12px; }
    .notifications-empty-card { margin-top: 12px; padding: 8px 0 24px; }
    .notifications-paginator {
      border-top: 1px solid var(--line-2);
      background: var(--surface);
    }
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
    .notification-row.from-complaint { background: rgba(229, 115, 115, 0.07); border-inline-start: 3px solid #e57373; }
    .notification-row.from-complaint:hover { background: rgba(229, 115, 115, 0.14); }
    .notification-row.from-complaint.unread { background: rgba(229, 115, 115, 0.12); }
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
    .complaint-origin-icon {
      background: rgba(229, 115, 115, 0.12);
      color: #c62828;
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
    .notification-meta {
      color: var(--text-subtle);
      font-size: 0.78rem;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
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
  readonly pageSize = 5;
  pageIndex = 0;
  totalElements = 0;
  tabIndex = 0;
  private activeScope: 'recent' | 'older' = 'recent';

  constructor(
    private readonly service: NotificationService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onTabChange(index: number): void {
    this.tabIndex = index;
    this.activeScope = index === 0 ? 'recent' : 'older';
    this.pageIndex = 0;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.load();
  }

  private load(): void {
    this.service.getMy({ page: this.pageIndex, size: this.pageSize, scope: this.activeScope }).subscribe({
      next: (res) => {
        const data = res.data;
        this.notifications = data?.content ?? [];
        this.totalElements = data?.totalElements ?? 0;
      },
      error: () => {
        this.notifications = [];
        this.totalElements = 0;
      }
    });
  }

  markAllRead(): void {
    this.service.markAllRead().subscribe(() => {
      this.service.setUnreadCount(0);
      this.load();
    });
  }

  open(item: AppNotification): void {
    if (!item.read) {
      this.service.markRead(item.id).subscribe(() => {
        item.read = true;
      });
    }
    const target = resolveNotificationTargetUrl(item, this.auth);
    if (target != null && target !== '') {
      void this.router.navigateByUrl(target);
      return;
    }
    /** No mapped screen — stay on the inbox (avoid sending users to the dashboard). */
  }

  notificationTitle(notification: AppNotification): string {
    return resolveNotificationTitle(this.i18n, notification);
  }

  notificationMessage(notification: AppNotification): string {
    const fromI18n = resolveNotificationBodyLine(this.i18n, notification);
    if (fromI18n) {
      return fromI18n;
    }

    const raw = notification.message ?? '';
    const bodySep = '\n\n—\n\n';
    if (raw.includes(bodySep)) {
      const picked = this.i18n.pickBilingualSegment(raw, 'body');
      return picked || this.i18n.instant('NOTIFICATIONS.GENERAL_MESSAGE');
    }

    if (this.i18n.currentLang === 'en') {
      const t = raw.trim();
      if (!this.hasArabic(t)) {
        return t || this.i18n.instant('NOTIFICATIONS.GENERAL_MESSAGE');
      }
      return this.i18n.instant('NOTIFICATIONS.GENERAL_MESSAGE');
    }

    if (this.hasArabic(raw)) return raw.trim();

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
      case 'CONTRACT_AWAITING_OWNER_REVIEW':
        return 'تم تسجيل عقد مسودة جديد على إحدى وحداتك ويحتاج لمراجعتك.';
      case 'TENANT_DRAFT_LEASE_PENDING_OWNER':
        return 'تم إنشاء مسودة عقد؛ الوحدة محجوزة بانتظار موافقة المالك.';
      case 'TENANT_LEASE_REJECTED_BY_OWNER':
        return 'رفض مالك العقار عقد الإيجار؛ راجع التفاصيل في الإشعار.';
      case 'TENANT_LEASE_AMENDED_BY_OWNER':
        return 'عدّل مالك العقار مسودة العقد؛ راجع ما تغيّر والسبب في الإشعار.';
      case 'TENANT_LEASE_OWNER_APPROVAL_DENIED':
        return 'لم يوافق المالك على تفعيل العقد بعد؛ العقد لا يزال مسودة.';
      case 'PROPERTY_LINKED_TO_OWNER':
        return 'تم ربط عقار جديد بحسابك كمالك.';
      case 'UNIT_ADDED_TO_OWNER_PROPERTY':
        return 'تمت إضافة وحدة جديدة على أحد عقاراتك.';
      case 'TENANT_REGISTERED_ON_OWNER_PROPERTY':
        return 'تم تسجيل مستأجر على وحدة من عقاراتك.';
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
    if (notification.type.includes('UNIT')) return 'apartment';
    if (notification.type.includes('TENANT')) return 'person';
    if (notification.type.includes('OWNER')) return 'account_balance';
    return 'notifications';
  }

  notificationActor(notification: AppNotification): string {
    const name = notification.actorDisplayName?.trim();
    if (name) return name;
    return this.i18n.instant('NOTIFICATIONS.SYSTEM');
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
