import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { PaymentService } from '../../../core/services/payment.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';

@Component({
  selector: 'app-overdue-payments',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, CurrencyPipe, DecimalPipe, RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, TranslateModule, PageHeaderComponent, EmptyStateComponent, TablePagerComponent, EstateLovSelectComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="'OVERDUE.TITLE' | translate"
        [subtitle]="'OVERDUE.SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.FINANCE_DASHBOARD' | translate), route: '/admin/finance/dashboard' },
          { label: ('OVERDUE.TITLE' | translate) }
        ]">
        <span class="overdue-badge" *ngIf="!loading && items.length > 0">
          {{ items.length }} {{ 'OVERDUE.ITEMS_LABEL' | translate }}
        </span>
      </app-page-header>

      <div class="finance-filter-strip" *ngIf="properties.length">
        <app-estate-lov-select
          [label]="'REQUEST_FORM.PROPERTY'"
          [options]="propertyLovOptions"
          [showAll]="true"
          allLabelKey="COMMON.ALL_PROPERTIES"
          [(ngModel)]="selectedPropertyId"
          (ngModelChange)="reload()">
        </app-estate-lov-select>
      </div>

      <div class="loading-center" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="app-card table-card" *ngIf="!loading">
        <div class="app-table-wrap" *ngIf="paged.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'OVERDUE.CONTRACT_COL' | translate }}</th>
                <th>{{ 'OVERDUE.TENANT_COL' | translate }}</th>
                <th>{{ 'OVERDUE.UNIT_COL' | translate }}</th>
                <th>{{ 'OVERDUE.DUE_DATE_COL' | translate }}</th>
                <th>{{ 'OVERDUE.AMOUNT_COL' | translate }}</th>
                <th>{{ 'OVERDUE.DAYS_LATE_COL' | translate }}</th>
                <th>{{ 'OVERDUE.STATUS_COL' | translate }}</th>
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of paged" [class.row-urgent]="daysLate(item) > 30">
                <td>
                  <a [routerLink]="['/admin/contracts', item.contractId]" class="link-cell">#{{ item.contractId }}</a>
                </td>
                <td>{{ item.tenantName || '-' }}</td>
                <td>{{ item.unitNumber || '-' }}</td>
                <td>{{ item.dueDate | date:'dd/MM/yyyy' }}</td>
                <td class="amount-cell overdue-amount">{{ item.amount | number:'1.2-2' }}</td>
                <td>
                  <span class="days-badge" [class.days-critical]="daysLate(item) > 30">
                    {{ daysLate(item) }} {{ 'OVERDUE.DAYS' | translate }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" data-status="OVERDUE">{{ 'OVERDUE.STATUS_OVERDUE' | translate }}</span>
                </td>
                <td class="actions-cell">
                  <button type="button" class="app-icon-btn warn"
                          *ngIf="canSendReminder(item)"
                          [disabled]="reminderSendingId === item.id"
                          (click)="sendReminder(item, $event)"
                          [matTooltip]="'CONTRACTS.SEND_OVERDUE_REMINDER' | translate">
                    <mat-icon>notifications_active</mat-icon>
                  </button>
                  <a class="app-icon-btn view"
                     [routerLink]="['/admin/contracts', item.contractId]"
                     [queryParams]="{ from: 'overdue', scheduleId: item.id, tab: 'schedule' }"
                     [matTooltip]="'ACTIONS.VIEW' | translate">
                    <mat-icon>visibility</mat-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          [length]="items.length"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (pageIndexChange)="pageIndex = $event">
        </app-table-pager>

        <ng-template #emptyTpl>
          <app-empty-state
            icon="check_circle"
            [title]="'OVERDUE.EMPTY_TITLE' | translate"
            [message]="'OVERDUE.EMPTY_MSG' | translate">
          </app-empty-state>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .overdue-badge {
      background: #fdecea; color: #c62828; border-radius: 16px;
      padding: 4px 14px; font-size: 0.83rem; font-weight: 600; border: 1px solid #ef9a9a;
    }
    .amount-cell { font-weight: 600; }
    .overdue-amount { color: var(--error, #c62828); }
    .days-badge {
      display: inline-block; background: #fff3e0; color: #e65100;
      border-radius: 10px; padding: 2px 10px; font-size: 0.8rem; font-weight: 600;
    }
    .days-critical { background: #fdecea; color: #c62828; }
    .row-urgent td { background: #fffafa; }
    .link-cell { color: var(--navy-800, #1a2744); text-decoration: none; font-weight: 500; }
    .link-cell:hover { text-decoration: underline; }
    .actions-cell { display: flex; gap: 4px; align-items: center; }
    .app-icon-btn.warn mat-icon { color: #c62828; }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      margin: 0 0 16px; padding: 12px 16px;
      border: 1px solid var(--line, #e4d8c8); background: var(--surface, #fffdf8); border-radius: 8px;
    }
    .finance-filter-strip label { color: var(--text-muted); font-weight: 700; }
  `]
})
export class OverduePaymentsComponent implements OnInit {
  items: any[] = [];
  properties: Property[] = [];
  selectedPropertyId: number | null = null;
  loading = true;
  readonly pageSize = 5;
  pageIndex = 0;
  reminderSendingId: number | null = null;

  get paged(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  constructor(
    private readonly paymentSvc: PaymentService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; },
      error: () => { this.properties = []; }
    });
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.pageIndex = 0;
    const params = this.selectedPropertyId ? { propertyId: this.selectedPropertyId } : undefined;
    this.paymentSvc.getOverdue(params).subscribe({
      next: (res) => {
        this.items = Array.isArray(res?.data) ? res.data : (res?.data?.content ?? []);
        this.loading = false;
      },
      error: () => { this.items = []; this.loading = false; }
    });
  }

  daysLate(item: any): number {
    if (!item.dueDate) return 0;
    const due = new Date(item.dueDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
    return Math.max(0, diff);
  }

  propertyLabel(property: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyNameEn || property.propertyName)
      : (property.propertyNameEn || property.propertyNameAr || property.propertyName);
    return property.propertyCode ? `${property.propertyCode} — ${name}` : name;
  }

  get propertyLovOptions(): EstateLovOption[] {
    return this.properties.map((p) => ({
      value: p.id,
      label: this.propertyLabel(p)
    }));
  }

  isReminderBackendSnoozed(item: any): boolean {
    if (!item?.overdueReminderSnoozedUntil) return false;
    return new Date(item.overdueReminderSnoozedUntil).getTime() > Date.now();
  }

  canSendReminder(item: any): boolean {
    return !!item?.id && !this.isReminderBackendSnoozed(item);
  }

  sendReminder(item: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canSendReminder(item) || this.reminderSendingId != null) return;
    this.reminderSendingId = item.id;
    this.paymentSvc.sendOverdueReminder(item.id).subscribe({
      next: (res) => {
        this.reminderSendingId = null;
        if (res.data) {
          this.items = this.items.map((row) => row.id === item.id ? res.data : row);
        }
        this.snack.success(this.i18n.instant('CONTRACTS.OVERDUE_REMINDER_SENT'));
      },
      error: (e: { error?: { message?: string; code?: string } }) => {
        this.reminderSendingId = null;
        if (e?.error?.code === 'OVERDUE_REMINDER_SNOOZED') {
          this.snack.error(this.i18n.instant('CONTRACTS.OVERDUE_REMINDER_SNOOZED'));
          return;
        }
        this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
