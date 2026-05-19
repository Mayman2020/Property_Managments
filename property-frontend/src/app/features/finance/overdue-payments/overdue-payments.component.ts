import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { PaymentService } from '../../../core/services/payment.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Property, PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-overdue-payments',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, CurrencyPipe, DecimalPipe, RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent, EmptyStateComponent, TablePagerComponent
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
        <label>{{ 'REQUEST_FORM.PROPERTY' | translate }}</label>
        <select [(ngModel)]="selectedPropertyId" (change)="reload()" class="estate-property-select">
          <option [ngValue]="null">{{ 'COMMON.ALL_PROPERTIES' | translate }}</option>
          <option *ngFor="let p of properties" [ngValue]="p.id">{{ propertyLabel(p) }}</option>
        </select>
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
                <td>
                  <a mat-stroked-button [routerLink]="['/admin/contracts', item.contractId]" style="font-size:0.8rem;">
                    {{ 'ACTIONS.VIEW' | translate }}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          *ngIf="items.length > pageSize"
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
  readonly pageSize = 15;
  pageIndex = 0;

  get paged(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  constructor(
    private readonly paymentSvc: PaymentService,
    private readonly propertySvc: PropertyService,
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
    return this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyNameEn || property.propertyName)
      : (property.propertyNameEn || property.propertyNameAr || property.propertyName);
  }
}
