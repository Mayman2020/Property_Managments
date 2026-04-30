import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { FinancialReportRow, FinanceService } from '../../core/services/finance.service';
import { Property, PropertyService } from '../../core/services/property.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, FormsModule, MatButtonModule, TranslateModule, PageHeaderComponent, TablePagerComponent],
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

        <button mat-stroked-button type="button" (click)="exportExcel()" title="Export Excel">
          <span class="material-icons">table_view</span>
          Excel
        </button>
        <button mat-stroked-button type="button" (click)="exportPdf()" title="Export PDF">
          <span class="material-icons">picture_as_pdf</span>
          PDF
        </button>
      </app-page-header>

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

  exportExcel(): void {
    import('xlsx').then(XLSX => {
      const propCol = this.translate.instant('FINANCE.PROP_OWNER_COL');
      const periodCol = this.translate.instant('FINANCE.PERIOD_COL');
      const revCol = this.translate.instant('FINANCE.REVENUE_COL');
      const expCol = this.translate.instant('FINANCE.EXPENSES_COL');
      const netCol = this.translate.instant('FINANCE.NET_COL');
      const data = this.rows.map(r => ({
        [propCol]: r.propertyName || r.ownerName || '-',
        [periodCol]: this.periodLabel(r),
        [revCol]: r.totalRevenue ?? r.cashIn ?? 0,
        [expCol]: r.totalExpenses ?? r.cashOut ?? 0,
        [netCol]: r.netIncome ?? r.ownerNetAmount ?? 0
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.title.slice(0, 31));
      XLSX.writeFile(wb, `finance-${this.report}-${this.fileDate()}.xlsx`);
    });
  }

  exportPdf(): void {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text(this.title, 14, 18);
        (doc as any).autoTable({
          startY: 28,
          head: [[
            this.translate.instant('FINANCE.PROP_OWNER_COL'),
            this.translate.instant('FINANCE.PERIOD_COL'),
            this.translate.instant('FINANCE.REVENUE_COL'),
            this.translate.instant('FINANCE.EXPENSES_COL'),
            this.translate.instant('FINANCE.NET_COL')
          ]],
          body: this.rows.map(r => [
            r.propertyName || r.ownerName || '-',
            this.periodLabel(r),
            (r.totalRevenue ?? r.cashIn ?? 0).toFixed(2),
            (r.totalExpenses ?? r.cashOut ?? 0).toFixed(2),
            (r.netIncome ?? r.ownerNetAmount ?? 0).toFixed(2)
          ]),
          styles: { font: 'helvetica', fontSize: 9 },
          headStyles: { fillColor: [245, 158, 11], textColor: 255 }
        });
        doc.save(`finance-${this.report}-${this.fileDate()}.pdf`);
      });
    });
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

  private fileDate(): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  }
}
