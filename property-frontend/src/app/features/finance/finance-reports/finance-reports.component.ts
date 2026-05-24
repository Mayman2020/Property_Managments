import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { FinancialReportRow, FinanceExportType, FinanceService } from '../../../core/services/finance.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, FormsModule, MatButtonModule, TranslateModule, PageHeaderComponent, TablePagerComponent, TableExportToolbarComponent],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'FINANCE.REPORTS_EYEBROW' | translate"
        [title]="title"
        [subtitle]="'FINANCE.REPORTS_SUBTITLE' | translate">

        <select [(ngModel)]="selectedPropertyId" (change)="onFilterChange()" class="estate-property-select">
          <option [ngValue]="null">{{ 'COMMON.ALL_PROPERTIES' | translate }}</option>
          <option *ngFor="let p of properties" [ngValue]="p.id">
            {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
          </option>
        </select>

        <select *ngIf="report === 'pnl'" [(ngModel)]="yearFrom" (change)="onFilterChange()" class="estate-property-select compact-select">
          <option *ngFor="let year of years" [ngValue]="year">{{ 'FINANCE.FROM_LABEL' | translate }} {{ year }}</option>
        </select>
        <select *ngIf="report === 'pnl'" [(ngModel)]="yearTo" (change)="onFilterChange()" class="estate-property-select compact-select">
          <option *ngFor="let year of years" [ngValue]="year">{{ 'FINANCE.TO_LABEL' | translate }} {{ year }}</option>
        </select>

        <app-table-export-toolbar
          permissionKey="finance"
          [title]="title"
          [fileName]="'finance-' + report"
          [columns]="exportColumns"
          [rows]="rows">
        </app-table-export-toolbar>
      </app-page-header>

      <section class="app-card export-card">
        <div class="export-filters">
          <label>{{ 'FINANCE.EXPORT_FROM' | translate }}</label>
          <input type="date" [(ngModel)]="exportFrom">
          <label>{{ 'FINANCE.EXPORT_TO' | translate }}</label>
          <input type="date" [(ngModel)]="exportTo">
          <label>{{ 'FINANCE.EXPORT_TYPE' | translate }}</label>
          <select [(ngModel)]="exportType" class="estate-property-select">
            <option value="ALL">{{ 'FINANCE.EXPORT_TYPE_ALL' | translate }}</option>
            <option value="RENT_INCOME">{{ 'FINANCE.EXPORT_TYPE_RENT' | translate }}</option>
            <option value="EXPENSES">{{ 'FINANCE.EXPORT_TYPE_EXPENSES' | translate }}</option>
            <option value="PAYROLL">{{ 'FINANCE.EXPORT_TYPE_PAYROLL' | translate }}</option>
          </select>
          <button mat-flat-button color="primary" [disabled]="exportLoading || !exportFrom || !exportTo" (click)="downloadServerCsv()">
            {{ 'FINANCE.EXPORT_DOWNLOAD' | translate }}
          </button>
        </div>
      </section>

      <div class="app-card" *ngIf="rows.length; else emptyTpl">
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'FINANCE.PROP_OWNER_COL' | translate }}</th>
                <th>{{ 'FINANCE.PERIOD_COL' | translate }}</th>
                <th>{{ 'FINANCE.REVENUE_COL' | translate }}</th>
                <th>{{ 'FINANCE.EXPENSES_COL' | translate }}</th>
                <th>{{ 'FINANCE.NET_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of pagedRows">
                <td>{{ row.propertyName || row.ownerName || '-' }}</td>
                <td>{{ periodLabel(row) }}</td>
                <td>{{ (row.totalRevenue ?? row.cashIn ?? 0) | number:'1.0-2' }}</td>
                <td>{{ (row.totalExpenses ?? row.cashOut ?? 0) | number:'1.0-2' }}</td>
                <td [class.text-positive]="(row.netIncome ?? row.ownerNetAmount ?? 0) >= 0"
                    [class.text-negative]="(row.netIncome ?? row.ownerNetAmount ?? 0) < 0">
                  {{ (row.netIncome ?? row.ownerNetAmount ?? 0) | number:'1.0-2' }}
                </td>
              </tr>
            </tbody>
            <tfoot *ngIf="rows.length > 1">
              <tr class="totals-row">
                <td colspan="2"><strong>{{ 'FINANCE.TOTAL_LABEL' | translate }}</strong></td>
                <td><strong>{{ totalRevenue | number:'1.0-2' }}</strong></td>
                <td><strong>{{ totalExpenses | number:'1.0-2' }}</strong></td>
                <td><strong>{{ totalNet | number:'1.0-2' }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <app-table-pager [length]="rows.length" [pageSize]="pageSize" [pageIndex]="pageIndex" (pageIndexChange)="pageIndex = $event"></app-table-pager>
      </div>

      <ng-template #emptyTpl>
        <div class="app-empty-state">
          <span class="material-icons empty-icon">summarize</span>
          <h4>{{ 'FINANCE.NO_REPORT_ROWS' | translate }}</h4>
          <p>{{ 'FINANCE.NO_REPORT_DESC' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .compact-select { width: 120px; }
    .text-positive { color: var(--green-600, #16a34a); font-weight: 600; }
    .text-negative { color: var(--red-500, #ef4444); font-weight: 600; }
    tfoot.totals-row td, tr.totals-row td {
      background: var(--surface-alt, #f9fafb);
      border-top: 2px solid var(--line);
    }
    .export-card { margin-bottom: 1rem; }
    .export-filters {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; align-items: center; padding: 1rem;
    }
    .export-filters label { font-size: 0.85rem; color: var(--ink-500); }
    .export-filters input[type="date"] { padding: 0.35rem 0.5rem; border: 1px solid var(--line); border-radius: 6px; }
  `]
})
export class FinanceReportsComponent implements OnInit {
  report = 'pnl';
  rows: FinancialReportRow[] = [];
  properties: Property[] = [];
  selectedPropertyId: number | null = null;
  readonly pageSize = 5;
  pageIndex = 0;
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 8 }, (_, i) => this.currentYear - i);
  yearFrom = this.currentYear;
  yearTo = this.currentYear;
  exportFrom = '';
  exportTo = '';
  exportType: FinanceExportType = 'ALL';
  exportLoading = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: FinanceService,
    private readonly propertyService: PropertyService,
    private readonly translate: TranslateService,
    readonly i18n: I18nService
  ) {}

  get title(): string {
    if (this.report === 'cashflow') return this.translate.instant('FINANCE.CASH_FLOW_TITLE');
    if (this.report === 'owner-statement') return this.translate.instant('FINANCE.OWNER_STATEMENT_TITLE');
    return this.translate.instant('FINANCE.PNL_TITLE');
  }

  get pagedRows(): FinancialReportRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get totalRevenue(): number {
    return this.rows.reduce((s, r) => s + (r.totalRevenue ?? r.cashIn ?? 0), 0);
  }

  get totalExpenses(): number {
    return this.rows.reduce((s, r) => s + (r.totalExpenses ?? r.cashOut ?? 0), 0);
  }

  get totalNet(): number {
    return this.rows.reduce((s, r) => s + (r.netIncome ?? r.ownerNetAmount ?? 0), 0);
  }

  ngOnInit(): void {
    this.report = this.route.snapshot.data['report'] ?? 'pnl';
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    this.exportFrom = `${y}-${m}-01`;
    this.exportTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    this.propertyService.getAll(0, 100).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; },
      error: () => {}
    });
    this.loadReport();
  }

  onFilterChange(): void {
    this.normalizeYears();
    this.pageIndex = 0;
    this.loadReport();
  }

  periodLabel(row: FinancialReportRow): string {
    const month = row.statementMonth ?? row.month;
    const year = row.statementYear ?? row.year;
    if (this.report === 'pnl') return year ? String(year) : '-';
    return `${month || '-'}/${year || '-'}`;
  }

  private loadReport(): void {
    this.normalizeYears();
    const pid = this.normalizedPropertyId();
    const load = this.report === 'cashflow'
      ? this.service.getCashflow(pid)
      : this.report === 'owner-statement'
        ? this.service.getOwnerStatements(pid)
        : this.service.getPnl(pid, this.yearFrom, this.yearTo);
    load.subscribe({ next: (res) => { this.rows = this.normalizeRows(res.data ?? []); }, error: () => { this.rows = []; } });
  }

  private normalizeRows(rows: FinancialReportRow[]): FinancialReportRow[] {
    if (this.report !== 'pnl') return rows;
    const grouped = new Map<string, FinancialReportRow>();
    rows.forEach((row) => {
      const key = `${row.propertyName || '-'}-${row.year || ''}`;
      const current = grouped.get(key) ?? { propertyName: row.propertyName, year: row.year, totalRevenue: 0, totalExpenses: 0, netIncome: 0 };
      current.totalRevenue = (current.totalRevenue || 0) + (row.totalRevenue || 0);
      current.totalExpenses = (current.totalExpenses || 0) + (row.totalExpenses || 0);
      current.netIncome = (current.netIncome || 0) + (row.netIncome || 0);
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }

  get exportColumns(): ExportColumn<FinancialReportRow>[] {
    return [
      { header: this.translate.instant('FINANCE.PROP_OWNER_COL'), value: (row) => row.propertyName || row.ownerName || '-' },
      { header: this.translate.instant('FINANCE.PERIOD_COL'), value: (row) => this.periodLabel(row) },
      { header: this.translate.instant('FINANCE.REVENUE_COL'), value: (row) => row.totalRevenue ?? row.cashIn ?? 0 },
      { header: this.translate.instant('FINANCE.EXPENSES_COL'), value: (row) => row.totalExpenses ?? row.cashOut ?? 0 },
      { header: this.translate.instant('FINANCE.NET_COL'), value: (row) => row.netIncome ?? row.ownerNetAmount ?? 0 }
    ];
  }

  private normalizeYears(): void {
    this.yearFrom = Number(this.yearFrom);
    this.yearTo = Number(this.yearTo);
    if (this.yearFrom > this.yearTo) {
      [this.yearFrom, this.yearTo] = [this.yearTo, this.yearFrom];
    }
  }

  private normalizedPropertyId(): number | undefined {
    const value = Number(this.selectedPropertyId);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  downloadServerCsv(): void {
    if (!this.exportFrom || !this.exportTo) return;
    this.exportLoading = true;
    this.service.downloadCsv(this.exportFrom, this.exportTo, this.exportType).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-export-${this.exportType.toLowerCase()}-${this.exportFrom}_${this.exportTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportLoading = false;
      },
      error: () => { this.exportLoading = false; }
    });
  }

}
