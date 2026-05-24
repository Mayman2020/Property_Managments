import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { ReportsService, ContractExpiryRow } from '../../../../core/services/reports.service';
import { PropertyService, Property } from '../../../../core/services/property.service';
import { SnackService } from '../../../../core/services/snack.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../../shared/components/table-export-toolbar/table-export-toolbar.component';

@Component({
  selector: 'app-contract-expiry-report',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, DecimalPipe, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, TableExportToolbarComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="('INLINE_TEXT.CONTRACT_EXPIRY_REPORT' | translate)"
        [subtitle]="('INLINE_TEXT.CONTRACTS_EXPIRING_IN_THE_UPCOMING_PERIOD' | translate)"
        [breadcrumbs]="[
          { label: ('NAV.DASHBOARD' | translate), route: '/admin/dashboard' },
          { label: ('NAV.CONTRACT_EXPIRY_REPORT' | translate) }
        ]">
      </app-page-header>

      <!-- Summary Cards -->
      <div class="summary-cards" *ngIf="!loading && rows.length > 0">
        <div class="summary-card urgent">
          <mat-icon>warning</mat-icon>
          <div>
            <div class="card-number">{{ urgentCount }}</div>
            <div class="card-label">{{ ('INLINE_TEXT.WITHIN_30_DAYS' | translate) }}</div>
          </div>
        </div>
        <div class="summary-card warning">
          <mat-icon>schedule</mat-icon>
          <div>
            <div class="card-number">{{ rows.length }}</div>
            <div class="card-label">{{ ('INLINE_TEXT.TOTAL_CONTRACTS' | translate) }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>

      <!-- Table -->
      <div *ngIf="!loading" class="app-card table-card directory-table-card">
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top">
            <div class="finance-filter-strip">
              <label>{{ ('INLINE_TEXT.EXPIRING_WITHIN' | translate) }}</label>
              <select [(ngModel)]="daysAhead" (change)="onFiltersChange()" class="estate-property-select">
                <option [ngValue]="30">30 {{ ('INLINE_TEXT.DAYS' | translate) }}</option>
                <option [ngValue]="60">60 {{ ('INLINE_TEXT.DAYS' | translate) }}</option>
                <option [ngValue]="90">90 {{ ('INLINE_TEXT.DAYS' | translate) }}</option>
                <option [ngValue]="180">180 {{ ('INLINE_TEXT.DAYS' | translate) }}</option>
              </select>

              <label *ngIf="properties.length">{{ ('INLINE_TEXT.PROPERTY' | translate) }}</label>
              <select *ngIf="properties.length" [(ngModel)]="filterPropertyId" (change)="onFiltersChange()" class="estate-property-select">
                <option [ngValue]="null">{{ ('INLINE_TEXT.ALL' | translate) }}</option>
                <option *ngFor="let p of properties" [ngValue]="p.id">
                  {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
                </option>
              </select>
            </div>

            <app-table-export-toolbar
              permissionKey="contracts"
              [title]="('INLINE_TEXT.CONTRACT_EXPIRY_REPORT' | translate)"
              fileName="contract-expiry-report"
              [columns]="exportColumns"
              [rows]="rows">
            </app-table-export-toolbar>
          </div>
        </div>

        <div class="app-table-wrap" *ngIf="rows.length > 0; else emptyContractExpiryTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ ('INLINE_TEXT.CONTRACT' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.PROPERTY' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.UNIT' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.TENANT' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.END_DATE' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.DAYS_LEFT' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.MONTHLY_RENT' | translate) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of pagedRows" [class.urgent-row]="row.daysRemaining <= 30">
                <td>{{ row.contractNumber }}</td>
                <td>{{ row.propertyName }}</td>
                <td>{{ row.unitNumber }}</td>
                <td>{{ row.tenantName }}</td>
                <td>{{ row.endDate | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="days-badge" [class.urgent]="row.daysRemaining <= 30" [class.warning]="row.daysRemaining <= 60">
                    {{ row.daysRemaining }} {{ ('INLINE_TEXT.DAYS_2' | translate) }}
                  </span>
                </td>
                <td>{{ row.monthlyRent | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager *ngIf="rows.length > 0" [length]="rows.length" [pageSize]="pageSize" [pageIndex]="pageIndex" (pageIndexChange)="pageIndex = $event"></app-table-pager>

        <ng-template #emptyContractExpiryTpl>
          <app-empty-state
            icon="check_circle"
            [message]="('INLINE_TEXT.NO_CONTRACTS_EXPIRING_IN_THIS_PERIOD' | translate)">
          </app-empty-state>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; padding: 60px 0; }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 8px 12px;
      border: 1px solid var(--line-2, #e4d8c8); background: rgba(255, 255, 255, 0.72); border-radius: 12px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }
    .finance-filter-strip label { color: var(--text-muted); font-size: 12px; font-weight: 600; white-space: nowrap; }

    .summary-cards { display: flex; gap: 16px; margin-bottom: 20px; }
    .summary-card {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 24px; border-radius: 10px; min-width: 160px;
    }
    .summary-card.urgent { background: #fef2f2; color: #dc2626; }
    .summary-card.warning { background: #fff7ed; color: #ea580c; }
    .summary-card mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .card-number { font-size: 28px; font-weight: 700; line-height: 1; }
    .card-label { font-size: 12px; opacity: 0.8; margin-top: 2px; }

    .table-card { padding: 0; overflow: hidden; }
    .app-data-table .urgent-row { background: #fef2f2; }

    .days-badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #f3f4f6; }
    .days-badge.urgent { background: #fee2e2; color: #dc2626; }
    .days-badge.warning { background: #fef3c7; color: #d97706; }
  `]
})
export class ContractExpiryReportComponent implements OnInit {
  rows: ContractExpiryRow[] = [];
  properties: Property[] = [];
  loading = true;
  daysAhead = 90;
  filterPropertyId: number | null = null;
  readonly pageSize = 5;
  pageIndex = 0;

  get urgentCount(): number {
    return this.rows.filter(r => r.daysRemaining <= 30).length;
  }

  get pagedRows(): ContractExpiryRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get exportColumns(): ExportColumn<ContractExpiryRow>[] {
    return [
      { header: this.i18n.instant('INLINE_TEXT.CONTRACT'), value: (row) => row.contractNumber },
      { header: this.i18n.instant('INLINE_TEXT.PROPERTY'), value: (row) => row.propertyName },
      { header: this.i18n.instant('INLINE_TEXT.UNIT'), value: (row) => row.unitNumber },
      { header: this.i18n.instant('INLINE_TEXT.TENANT'), value: (row) => row.tenantName },
      { header: this.i18n.instant('INLINE_TEXT.END_DATE'), value: (row) => row.endDate },
      { header: this.i18n.instant('INLINE_TEXT.DAYS_LEFT'), value: (row) => row.daysRemaining },
      { header: this.i18n.instant('INLINE_TEXT.MONTHLY_RENT'), value: (row) => row.monthlyRent }
    ];
  }

  constructor(
    private readonly reportsService: ReportsService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reportsService.getContractExpiry(this.daysAhead, this.filterPropertyId ?? undefined).subscribe({
      next: (res) => { this.rows = res.data ?? []; this.pageIndex = 0; this.loading = false; },
      error: () => { this.loading = false; this.snack.error('INLINE_TEXT.FAILED_TO_LOAD_REPORT'); }
    });
  }

  onFiltersChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  exportCsv(): void {
    const header = ['Contract #', 'Property', 'Unit', 'Tenant', 'End Date', 'Days Left', 'Monthly Rent'];
    const csvRows = this.rows.map(r => [
      r.contractNumber, r.propertyName, r.unitNumber, r.tenantName,
      r.endDate, r.daysRemaining, r.monthlyRent
    ]);
    const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contract-expiry-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
