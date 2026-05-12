import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { BudgetItem, ExpenseItem, FinanceDashboardDto, FinanceService, RevenueItem } from '../../../core/services/finance.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ExpenseDialogComponent } from '../expense-dialog/expense-dialog.component';
import { RevenueDialogComponent } from '../revenue-dialog/revenue-dialog.component';

@Component({
  selector: 'app-finance-workspace',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, CurrencyPipe, DatePipe, RouterLink, TranslateModule, MatButtonModule, PageHeaderComponent, TablePagerComponent, FilterBarComponent],
  template: `
    <div class="app-page">
      <app-page-header [eyebrow]="'NAV.FINANCE_DASHBOARD' | translate" [title]="title" [subtitle]="subtitle">

        <a mat-stroked-button routerLink="/admin/finance/reports/pnl" *ngIf="section === 'dashboard'">
          <span class="material-icons">summarize</span>
          {{ 'FINANCE.REPORTS' | translate }}
        </a>

        <ng-container *ngIf="section === 'expenses'">
          <button mat-stroked-button type="button" (click)="exportExcel('expenses')" title="Export Excel">
            <span class="material-icons">table_view</span> Excel
          </button>
          <button mat-stroked-button type="button" (click)="exportPdf('expenses')" title="Export PDF">
            <span class="material-icons">picture_as_pdf</span> PDF
          </button>
          <button mat-flat-button (click)="openAddExpense()">
            <span class="material-icons">add</span>{{ 'FINANCE.ADD_EXPENSE' | translate }}
          </button>
        </ng-container>

        <ng-container *ngIf="section === 'revenues'">
          <button mat-stroked-button type="button" (click)="exportExcel('revenues')" title="Export Excel">
            <span class="material-icons">table_view</span> Excel
          </button>
          <button mat-stroked-button type="button" (click)="exportPdf('revenues')" title="Export PDF">
            <span class="material-icons">picture_as_pdf</span> PDF
          </button>
          <button mat-flat-button (click)="openAddRevenue()">
            <span class="material-icons">add</span>{{ 'FINANCE.ADD_REVENUE' | translate }}
          </button>
        </ng-container>

        <ng-container *ngIf="section === 'budget'">
          <button mat-stroked-button type="button" (click)="exportExcel('budget')" title="Export Excel">
            <span class="material-icons">table_view</span> Excel
          </button>
          <button mat-stroked-button type="button" (click)="exportPdf('budget')" title="Export PDF">
            <span class="material-icons">picture_as_pdf</span> PDF
          </button>
        </ng-container>
      </app-page-header>

      <div style="padding: 8px 0 0;" *ngIf="properties.length > 1">
        <app-filter-bar [filters]="pageFilters" [filterValues]="filterValues" (filtersChange)="onFilterBarChange($event)"></app-filter-bar>
      </div>

      <ng-container *ngIf="section === 'dashboard'">
        <section class="stat-grid">
          <article class="stat-card surface-glow" *ngFor="let card of dashboardCards">
            <div class="stat-content">
              <div class="stat-label">{{ card.label }}</div>
              <div class="stat-value">{{ card.value }}</div>
            </div>
          </article>
        </section>
        <section class="quick-actions-grid">
          <a class="quick-action-card" routerLink="/admin/finance/expenses">
            <span class="material-icons">receipt_long</span>
            <h4>{{ 'NAV.EXPENSES' | translate }}</h4>
            <p>{{ 'FINANCE.EXPENSES_TITLE' | translate }}</p>
          </a>
          <a class="quick-action-card" routerLink="/admin/finance/revenues">
            <span class="material-icons">trending_up</span>
            <h4>{{ 'NAV.REVENUES' | translate }}</h4>
            <p>{{ 'FINANCE.REVENUES_TITLE' | translate }}</p>
          </a>
        </section>
      </ng-container>

      <div class="app-card" *ngIf="section === 'expenses'">
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ 'FINANCE.DESCRIPTION_COL' | translate }}</th>
                <th>{{ 'FINANCE.AMOUNT_COL' | translate }}</th>
                <th>{{ 'FINANCE.DATE_COL' | translate }}</th>
                <th>{{ 'FINANCE.STATUS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedExpenses">
                <td>{{ item.expenseNumber }}</td>
                <td>{{ item.description }}</td>
                <td>{{ item.amount | number:'1.0-2' }} {{ item.currency || 'OMR' }}</td>
                <td>{{ item.expenseDate | date:'dd/MM/yyyy' }}</td>
                <td><span class="status-badge" [attr.data-status]="item.status || 'PENDING'">{{ statusLabel(item.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager [length]="expenses.length" [pageSize]="pageSize" [pageIndex]="expensesPageIndex" (pageIndexChange)="expensesPageIndex = $event"></app-table-pager>
      </div>

      <div class="app-card" *ngIf="section === 'revenues'">
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ 'FINANCE.DESCRIPTION_COL' | translate }}</th>
                <th>{{ 'FINANCE.AMOUNT_COL' | translate }}</th>
                <th>{{ 'FINANCE.DATE_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedRevenues">
                <td>{{ item.revenueNumber }}</td>
                <td>{{ item.description }}</td>
                <td>{{ item.amount | number:'1.0-2' }} {{ item.currency || 'OMR' }}</td>
                <td>{{ item.revenueDate | date:'dd/MM/yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager [length]="revenues.length" [pageSize]="pageSize" [pageIndex]="revenuesPageIndex" (pageIndexChange)="revenuesPageIndex = $event"></app-table-pager>
      </div>

      <div class="app-card" *ngIf="section === 'budget'">
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'FINANCE.CATEGORY_COL' | translate }}</th>
                <th>{{ 'FINANCE.BUDGET_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedBudgets">
                <td>{{ item.categoryName || '-' }}</td>
                <td>{{ item.budgetedAmount | number:'1.0-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager [length]="budgets.length" [pageSize]="pageSize" [pageIndex]="budgetPageIndex" (pageIndexChange)="budgetPageIndex = $event"></app-table-pager>
      </div>

      <div class="app-empty-state" *ngIf="showEmptyState">
        <span class="material-icons empty-icon">finance_mode</span>
        <h4>{{ 'FINANCE.NO_DATA' | translate }}</h4>
        <p>{{ 'FINANCE.NO_DATA_DESC' | translate }}</p>
      </div>
    </div>
  `
})
export class FinanceWorkspaceComponent implements OnInit {
  section = 'dashboard';
  dashboard?: FinanceDashboardDto;
  expenses: ExpenseItem[] = [];
  revenues: RevenueItem[] = [];
  budgets: BudgetItem[] = [];
  properties: Property[] = [];
  selectedPropertyId: number | null = null;
  pageFilters: FilterSpec[] = [];
  readonly pageSize = 5;
  expensesPageIndex = 0;
  revenuesPageIndex = 0;
  budgetPageIndex = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: FinanceService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService,
    readonly i18n: I18nService
  ) {}

  get isArabic(): boolean { return this.i18n.currentLang === 'ar'; }

  get title(): string {
    const map: Record<string, string> = {
      dashboard: 'FINANCE.DASHBOARD_TITLE',
      expenses: 'FINANCE.EXPENSES_TITLE',
      revenues: 'FINANCE.REVENUES_TITLE',
      budget: 'FINANCE.BUDGET_TITLE'
    };
    return this.translate.instant(map[this.section] ?? 'FINANCE.DASHBOARD_TITLE');
  }

  get subtitle(): string {
    const prop = this.selectedPropertyId
      ? this.properties.find(p => p.id === this.selectedPropertyId)
      : null;
    const propName = prop
      ? (this.isArabic ? (prop.propertyNameAr || prop.propertyName) : (prop.propertyNameEn || prop.propertyName))
      : this.translate.instant('COMMON.ALL_PROPERTIES');
    return this.translate.instant('FINANCE.VIEWING_DATA_FOR', { prop: propName });
  }

  get dashboardCards(): Array<{ label: string; value: string }> {
    const d = this.dashboard;
    if (!d) return [];
    return [
      { label: this.translate.instant('FINANCE.MONTHLY_REVENUE'), value: this.format(d.thisMonthCollected) },
      { label: this.translate.instant('FINANCE.MONTHLY_EXPENSES'), value: this.format(d.thisMonthExpenses) },
      { label: this.translate.instant('FINANCE.NET_INCOME'), value: this.format(d.netIncome) },
      { label: this.translate.instant('FINANCE.OVERDUE_RENT'), value: this.format(d.overdueAmount) }
    ];
  }

  get showEmptyState(): boolean {
    if (this.section === 'dashboard') return !this.dashboardCards.length;
    if (this.section === 'expenses') return !this.expenses.length;
    if (this.section === 'revenues') return !this.revenues.length;
    if (this.section === 'budget') return !this.budgets.length;
    return false;
  }

  get pagedExpenses(): ExpenseItem[] { return this.pageSlice(this.expenses, this.expensesPageIndex); }
  get pagedRevenues(): RevenueItem[] { return this.pageSlice(this.revenues, this.revenuesPageIndex); }
  get pagedBudgets(): BudgetItem[] { return this.pageSlice(this.budgets, this.budgetPageIndex); }

  get filterValues(): Record<string, unknown> {
    return {
      selectedPropertyId: this.selectedPropertyId
    };
  }

  openAddExpense(): void {
    this.dialog.open(ExpenseDialogComponent, {
      data: { properties: this.properties, defaultPropertyId: this.selectedPropertyId ?? undefined },
      width: '520px',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.loadSection(); });
  }

  openAddRevenue(): void {
    this.dialog.open(RevenueDialogComponent, {
      data: { properties: this.properties, defaultPropertyId: this.selectedPropertyId ?? undefined },
      width: '520px',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.loadSection(); });
  }

  onPropertyChange(): void {
    this.expensesPageIndex = 0;
    this.revenuesPageIndex = 0;
    this.budgetPageIndex = 0;
    this.loadSection();
  }

  loadSection(): void {
    const propertyId = this.normalizedPropertyId();
    if (this.section === 'dashboard') {
      this.service.getDashboard(propertyId).subscribe({
        next: (res) => { this.dashboard = res.data; },
        error: () => { this.dashboard = undefined; }
      });
    }
    if (this.section === 'expenses') {
      const params: Record<string, string | number> = { page: 0, size: 200 };
      if (propertyId) params['propertyId'] = propertyId;
      this.service.getExpenses(params).subscribe({
        next: (res) => { this.expenses = res.data?.content ?? []; },
        error: () => { this.expenses = []; }
      });
    }
    if (this.section === 'revenues') {
      const params: Record<string, string | number> = { page: 0, size: 200 };
      if (propertyId) params['propertyId'] = propertyId;
      this.service.getRevenues(params).subscribe({
        next: (res) => { this.revenues = res.data?.content ?? []; },
        error: () => { this.revenues = []; }
      });
    }
    if (this.section === 'budget') {
      this.service.getBudgets(propertyId).subscribe({
        next: (res) => { this.budgets = res.data ?? []; },
        error: () => { this.budgets = []; }
      });
    }
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'dashboard';
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; this.setupFilters(); },
      error: () => {}
    });
    this.loadSection();
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'selectedPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      }
    ];
  }

  onFilterBarChange(values: any): void {
    if (values?.selectedPropertyId !== undefined) this.selectedPropertyId = values.selectedPropertyId;
    this.onPropertyChange();
  }

  exportExcel(type: string): void {
    import('xlsx').then(XLSX => {
      let headers: string[];
      let data: unknown[][];

      if (type === 'expenses') {
        headers = [
          '#',
          this.translate.instant('FINANCE.DESCRIPTION_COL'),
          this.translate.instant('FINANCE.AMOUNT_COL'),
          this.translate.instant('COMMON.OMR'),
          this.translate.instant('FINANCE.DATE_COL'),
          this.translate.instant('FINANCE.STATUS_COL')
        ];
        data = this.expenses.map(r => [r.expenseNumber, r.description, r.amount, r.currency || 'OMR', this.formatDate(r.expenseDate), this.statusLabel(r.status)]);
      } else if (type === 'revenues') {
        headers = [
          '#',
          this.translate.instant('FINANCE.DESCRIPTION_COL'),
          this.translate.instant('FINANCE.AMOUNT_COL'),
          this.translate.instant('COMMON.OMR'),
          this.translate.instant('FINANCE.DATE_COL')
        ];
        data = this.revenues.map(r => [r.revenueNumber, r.description, r.amount, r.currency || 'OMR', this.formatDate(r.revenueDate)]);
      } else {
        headers = [
          this.translate.instant('FINANCE.CATEGORY_COL'),
          this.translate.instant('FINANCE.BUDGET_COL')
        ];
        data = this.budgets.map(r => [r.categoryName || '-', r.budgetedAmount]);
      }

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.title.slice(0, 31));
      XLSX.writeFile(wb, `${type}-${this.fileDate()}.xlsx`);
    });
  }

  exportPdf(type: string): void {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const propLabel = this.selectedPropertyId
          ? this.properties.find(p => p.id === this.selectedPropertyId)?.propertyName ?? ''
          : this.translate.instant('COMMON.ALL_PROPERTIES');
        doc.setFontSize(16);
        doc.text(this.title, 14, 18);
        doc.setFontSize(10);
        doc.text(propLabel + '  |  ' + this.formatDate(new Date()), 14, 27);

        let head: string[][];
        let body: unknown[][];

        if (type === 'expenses') {
          head = [[
            '#',
            this.translate.instant('FINANCE.DESCRIPTION_COL'),
            this.translate.instant('FINANCE.AMOUNT_COL'),
            this.translate.instant('FINANCE.DATE_COL'),
            this.translate.instant('FINANCE.STATUS_COL')
          ]];
          body = this.expenses.map(r => [r.expenseNumber, r.description, `${r.amount.toFixed(2)} ${r.currency || 'OMR'}`, this.formatDate(r.expenseDate), this.statusLabel(r.status)]);
        } else if (type === 'revenues') {
          head = [[
            '#',
            this.translate.instant('FINANCE.DESCRIPTION_COL'),
            this.translate.instant('FINANCE.AMOUNT_COL'),
            this.translate.instant('FINANCE.DATE_COL')
          ]];
          body = this.revenues.map(r => [r.revenueNumber, r.description, `${r.amount.toFixed(2)} ${r.currency || 'OMR'}`, this.formatDate(r.revenueDate)]);
        } else {
          head = [[
            this.translate.instant('FINANCE.CATEGORY_COL'),
            this.translate.instant('FINANCE.BUDGET_COL')
          ]];
          body = this.budgets.map(r => [r.categoryName || '-', r.budgetedAmount.toFixed(2)]);
        }

        (doc as any).autoTable({
          startY: 34, head, body,
          styles: { font: 'helvetica', fontSize: 9 },
          headStyles: { fillColor: [245, 158, 11], textColor: 255 }
        });
        doc.save(`${type}-${this.fileDate()}.pdf`);
      });
    });
  }

  statusLabel(status?: string): string {
    return this.translate.instant(`STATUS.${status || 'PENDING'}`);
  }

  private format(value = 0): string {
    return `${new Intl.NumberFormat(this.isArabic ? 'ar' : 'en-US', { maximumFractionDigits: 0 }).format(value)} ${this.translate.instant('COMMON.OMR')}`;
  }

  private formatDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  private pageSlice<T>(items: T[], pageIndex: number): T[] {
    const start = pageIndex * this.pageSize;
    return items.slice(start, start + this.pageSize);
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
