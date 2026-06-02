import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SnackService } from '../../../core/services/snack.service';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { BudgetItem, ExpenseItem, FinanceDashboardDto, FinanceService, RevenueItem } from '../../../core/services/finance.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ExpenseDialogComponent } from '../expense-dialog/expense-dialog.component';
import { RevenueDialogComponent } from '../revenue-dialog/revenue-dialog.component';
import { PermissionService } from '../../../core/services/permission.service';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';

@Component({
  selector: 'app-finance-workspace',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, CurrencyPipe, DatePipe, RouterLink, FormsModule, TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PageHeaderComponent, TablePagerComponent, TableExportToolbarComponent, TableRowIndexPipe, EstateLovSelectComponent],
  template: `
    <div class="app-page">
      <app-page-header [eyebrow]="'NAV.FINANCE_DASHBOARD' | translate" [title]="title" [subtitle]="subtitle">

        <a mat-stroked-button routerLink="/admin/finance/reports/pnl" *ngIf="section === 'dashboard'">
          <span class="material-icons">summarize</span>
          {{ 'FINANCE.REPORTS' | translate }}
        </a>

        <ng-container *ngIf="section === 'expenses'">
          <app-table-export-toolbar
            permissionKey="finance"
            [title]="title"
            fileName="expenses"
            [columns]="expenseExportColumns"
            [rows]="expenses">
          </app-table-export-toolbar>
          <button mat-flat-button *ngIf="permissions.can('finance', 'create')" (click)="openAddExpense()">
            <span class="material-icons">add</span>{{ 'FINANCE.ADD_EXPENSE' | translate }}
          </button>
        </ng-container>

        <ng-container *ngIf="section === 'revenues'">
          <app-table-export-toolbar
            permissionKey="finance"
            [title]="title"
            fileName="revenues"
            [columns]="revenueExportColumns"
            [rows]="revenues">
          </app-table-export-toolbar>
          <button mat-flat-button *ngIf="permissions.can('finance', 'create')" (click)="openAddRevenue()">
            <span class="material-icons">add</span>{{ 'FINANCE.ADD_REVENUE' | translate }}
          </button>
        </ng-container>

        <ng-container *ngIf="section === 'budget'">
          <app-table-export-toolbar
            permissionKey="finance"
            [title]="title"
            fileName="budget"
            [columns]="budgetExportColumns"
            [rows]="budgets">
          </app-table-export-toolbar>
        </ng-container>
      </app-page-header>

      <div class="finance-filter-strip" *ngIf="properties.length > 0">
        <app-estate-lov-select
          [label]="'REQUEST_FORM.PROPERTY'"
          [options]="propertyLovOptions"
          [showAll]="true"
          allLabelKey="COMMON.ALL"
          [(ngModel)]="selectedPropertyId"
          (ngModelChange)="onPropertyChange()">
        </app-estate-lov-select>
        <app-estate-lov-select
          *ngIf="section === 'budget'"
          [label]="'FINANCE.YEAR_LABEL'"
          [options]="budgetYearLovOptions"
          [(ngModel)]="budgetYear"
          (ngModelChange)="onBudgetYearChange()">
        </app-estate-lov-select>
        <a mat-stroked-button routerLink="/admin/reports/budget-vs-actual" *ngIf="section === 'budget'">
          <mat-icon>bar_chart</mat-icon>
          {{ 'FINANCE.BUDGET_VS_ACTUAL_LINK' | translate }}
        </a>
      </div>

      <ng-container *ngIf="section === 'dashboard'">
        <section class="finance-overview">
          <div class="overview-copy">
            <span class="section-kicker">{{ 'NAV.FINANCE_DASHBOARD' | translate }}</span>
            <h3>{{ title }}</h3>
            <p>{{ subtitle }}</p>
          </div>
          <div class="overview-net">
            <span>{{ 'FINANCE.NET_INCOME' | translate }}</span>
            <strong>{{ format(dashboard?.netIncome || 0) }}</strong>
          </div>
        </section>

        <section class="estate-stat-grid finance-stat-grid">
          <article class="estate-stat-card teal" *ngFor="let card of dashboardCards">
            <div class="estate-stat-top">
              <span class="estate-stat-label">{{ card.label }}</span>
              <div class="estate-stat-icon"><span class="material-icons">{{ card.icon }}</span></div>
            </div>
            <div class="estate-stat-value">{{ card.value }}</div>
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
          <a class="quick-action-card" routerLink="/admin/accountant-portal/maintenance-invoices">
            <span class="material-icons">request_quote</span>
            <h4>{{ 'NAV.MAINTENANCE_INVOICES' | translate }}</h4>
            <p>{{ 'FINANCE.MONTHLY_EXPENSES' | translate }}</p>
          </a>
          <a class="quick-action-card" routerLink="/admin/hr/payroll">
            <span class="material-icons">payments</span>
            <h4>{{ 'NAV.PAYROLL' | translate }}</h4>
            <p>{{ 'NAV.FINANCE_DASHBOARD' | translate }}</p>
          </a>
        </section>

        <section class="ledger-grid">
          <div class="ledger-panel">
            <div class="panel-title">
              <span class="material-icons">receipt_long</span>
              <strong>{{ 'NAV.EXPENSES' | translate }}</strong>
            </div>
            <div class="mini-row" *ngFor="let item of expenses.slice(0, 4)">
              <span>{{ expenseDescription(item) }}</span>
              <strong>{{ item.amount | number:'1.0-2' }} {{ currencyLabel(item.currency) }}</strong>
            </div>
          </div>
          <div class="ledger-panel">
            <div class="panel-title">
              <span class="material-icons">trending_up</span>
              <strong>{{ 'NAV.REVENUES' | translate }}</strong>
            </div>
            <div class="mini-row" *ngFor="let item of revenues.slice(0, 4)">
              <span>{{ revenueDescription(item) }}</span>
              <strong>{{ item.amount | number:'1.0-2' }} {{ currencyLabel(item.currency) }}</strong>
            </div>
          </div>
        </section>
      </ng-container>

      <div class="app-card" *ngIf="section === 'expenses'">
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th class="table-index-col">#</th>
                <th>{{ 'FINANCE.DESCRIPTION_COL' | translate }}</th>
                <th>{{ 'FINANCE.AMOUNT_COL' | translate }}</th>
                <th>{{ 'FINANCE.DATE_COL' | translate }}</th>
                <th>{{ 'FINANCE.STATUS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedExpenses; let i = index">
                <td class="table-index-col">{{ i | tableRowIndex:expensesPageIndex:pageSize }}</td>
                <td>{{ expenseDescription(item) }}</td>
                <td>{{ item.amount | number:'1.0-2' }} {{ currencyLabel(item.currency) }}</td>
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
                <th class="table-index-col">#</th>
                <th>{{ 'FINANCE.DESCRIPTION_COL' | translate }}</th>
                <th>{{ 'FINANCE.AMOUNT_COL' | translate }}</th>
                <th>{{ 'FINANCE.DATE_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedRevenues; let i = index">
                <td class="table-index-col">{{ i | tableRowIndex:revenuesPageIndex:pageSize }}</td>
                <td>{{ revenueDescription(item) }}</td>
                <td>{{ item.amount | number:'1.0-2' }} {{ currencyLabel(item.currency) }}</td>
                <td>{{ item.revenueDate | date:'dd/MM/yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager [length]="revenues.length" [pageSize]="pageSize" [pageIndex]="revenuesPageIndex" (pageIndexChange)="revenuesPageIndex = $event"></app-table-pager>
      </div>

      <ng-container *ngIf="section === 'budget'">
        <div class="loading-center" *ngIf="budgetLoading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <ng-container *ngIf="!budgetLoading && budgets.length > 0">
          <div class="budget-kpi-grid">
            <article class="budget-kpi-card budgeted">
              <div class="bk-icon"><mat-icon>account_balance_wallet</mat-icon></div>
              <div>
                <div class="bk-value">{{ budgetTotals.budgeted | number:'1.0-0' }}</div>
                <div class="bk-label">{{ 'FINANCE.TOTAL_BUDGETED' | translate }}</div>
              </div>
            </article>
            <article class="budget-kpi-card actual">
              <div class="bk-icon"><mat-icon>payments</mat-icon></div>
              <div>
                <div class="bk-value">{{ budgetTotals.actual | number:'1.0-0' }}</div>
                <div class="bk-label">{{ 'FINANCE.TOTAL_ACTUAL' | translate }}</div>
              </div>
            </article>
            <article class="budget-kpi-card" [class.over]="budgetTotals.variance < 0">
              <div class="bk-icon"><mat-icon>{{ budgetTotals.variance >= 0 ? 'trending_down' : 'trending_up' }}</mat-icon></div>
              <div>
                <div class="bk-value">{{ (budgetTotals.variance < 0 ? -budgetTotals.variance : budgetTotals.variance) | number:'1.0-0' }}</div>
                <div class="bk-label">{{ budgetTotals.variance >= 0 ? ('FINANCE.REMAINING' | translate) : ('FINANCE.OVERSPENT' | translate) }}</div>
              </div>
            </article>
            <article class="budget-kpi-card utilization" [class.warn]="budgetTotals.utilization > 85 && budgetTotals.utilization <= 100" [class.over]="budgetTotals.utilization > 100">
              <div class="bk-icon"><mat-icon>donut_large</mat-icon></div>
              <div>
                <div class="bk-value">{{ budgetTotals.utilization | number:'1.1-1' }}%</div>
                <div class="bk-label">{{ 'FINANCE.UTILIZATION' | translate }}</div>
              </div>
            </article>
          </div>

          <div class="app-card">
            <div class="app-table-wrap">
              <table class="app-data-table">
                <thead>
                  <tr>
                    <th class="table-index-col">#</th>
                    <th *ngIf="!selectedPropertyId">{{ 'REQUEST_FORM.PROPERTY' | translate }}</th>
                    <th>{{ 'FINANCE.CATEGORY_COL' | translate }}</th>
                    <th>{{ 'FINANCE.PERIOD_COL' | translate }}</th>
                    <th class="num-col">{{ 'FINANCE.BUDGET_COL' | translate }}</th>
                    <th class="num-col">{{ 'FINANCE.ACTUAL_COL' | translate }}</th>
                    <th class="num-col">{{ 'FINANCE.VARIANCE_COL' | translate }}</th>
                    <th class="num-col">{{ 'FINANCE.UTILIZATION' | translate }}</th>
                    <th class="center-col">{{ 'FINANCE.STATUS_COL' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of pagedBudgets; let i = index" [class.over-row]="item.overBudget">
                    <td class="table-index-col">{{ i | tableRowIndex:budgetPageIndex:pageSize }}</td>
                    <td *ngIf="!selectedPropertyId">{{ item.propertyName || '-' }}</td>
                    <td>{{ budgetCategoryLabel(item) }}</td>
                    <td>{{ item.periodName || budgetYear }}</td>
                    <td class="num-col">{{ item.budgetedAmount | number:'1.0-2' }}</td>
                    <td class="num-col">{{ (item.actualAmount || 0) | number:'1.0-2' }}</td>
                    <td class="num-col" [class.positive]="(item.variance || 0) >= 0" [class.negative]="(item.variance || 0) < 0">
                      {{ (item.variance || 0) >= 0 ? '+' : '' }}{{ (item.variance || 0) | number:'1.0-2' }}
                    </td>
                    <td class="num-col">{{ (item.utilizationPercent || 0) | number:'1.1-1' }}%</td>
                    <td class="center-col">
                      <span class="status-badge" [class.badge-over]="item.overBudget" [class.badge-ok]="!item.overBudget">
                        {{ item.overBudget ? ('FINANCE.OVER_BUDGET' | translate) : ('FINANCE.WITHIN_BUDGET' | translate) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <app-table-pager [length]="budgets.length" [pageSize]="pageSize" [pageIndex]="budgetPageIndex" (pageIndexChange)="budgetPageIndex = $event"></app-table-pager>
          </div>
        </ng-container>
      </ng-container>

      <div class="app-empty-state" *ngIf="showEmptyState && !(section === 'budget' && budgetLoading)">
        <span class="material-icons empty-icon">finance_mode</span>
        <h4>{{ 'FINANCE.NO_DATA' | translate }}</h4>
        <p>{{ 'FINANCE.NO_DATA_DESC' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .finance-overview {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
      gap: 16px;
      align-items: stretch;
      margin-bottom: 16px;
    }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      margin: 0 0 16px; padding: 12px 14px;
      border-radius: 12px; background: rgba(255,255,255,0.72);
      border: 1px solid var(--line-2, #e4d8c8);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
    }
    .finance-filter-strip label {
      font-size: 12px; font-weight: 600; color: var(--text-muted); white-space: nowrap;
    }
    .overview-copy, .overview-net, .stat-card, .quick-action-card, .ledger-panel {
      border: 1px solid var(--line, #e4d8c8);
      background: var(--surface, #fffdf8);
      border-radius: 8px;
      box-shadow: 0 10px 24px rgba(15, 34, 55, 0.05);
    }
    .overview-copy { padding: 20px 24px; }
    .section-kicker { color: var(--gold, #b8862c); font-size: 0.82rem; font-weight: 700; }
    .overview-copy h3 { margin: 6px 0; font-size: 1.8rem; color: var(--navy-900, #102238); }
    .overview-copy p { margin: 0; color: var(--text-muted, #6c7890); }
    .overview-net { padding: 20px; display: grid; align-content: center; gap: 8px; }
    .overview-net span { color: var(--text-muted, #6c7890); font-weight: 700; }
    .overview-net strong { color: var(--navy-900, #102238); font-size: 2rem; font-weight: 800; }
    .finance-stat-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    .finance-stat-grid .estate-stat-card {
      position: relative;
      overflow: hidden;
      background: var(--surface, #fffdf8);
      border: 1px solid var(--card-border, #e4d8c8);
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 10px 24px rgba(15, 34, 55, 0.05);
      min-height: 132px;
    }
    .finance-stat-grid .estate-stat-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .finance-stat-grid .estate-stat-label {
      color: var(--text-muted, #6c7890);
      font-size: 0.85rem;
      font-weight: 700;
    }
    .finance-stat-grid .estate-stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: #f5ead5;
      color: #9a6a1f;
      flex-shrink: 0;
    }
    .finance-stat-grid .estate-stat-value {
      color: var(--navy-900, #102238);
      font-size: 1.55rem;
      font-weight: 800;
      margin-top: 20px;
      line-height: 1.1;
    }
    .stat-card { padding: 18px; display: flex; align-items: center; gap: 14px; min-height: 112px; }
    .stat-icon { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: #f5ead5; color: #9a6a1f; }
    .stat-label { color: var(--text-muted, #6c7890); font-size: 0.85rem; margin-bottom: 6px; }
    .stat-value { color: var(--navy-900, #102238); font-size: 1.55rem; font-weight: 800; }
    .quick-actions-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
    .quick-action-card { padding: 16px; color: inherit; text-decoration: none; display: grid; gap: 6px; min-height: 118px; }
    .quick-action-card .material-icons { color: #b8862c; }
    .quick-action-card h4 { margin: 0; color: var(--navy-900, #102238); }
    .quick-action-card p { margin: 0; color: var(--text-muted, #6c7890); font-size: 0.86rem; }
    .ledger-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .ledger-panel { padding: 16px; }
    .panel-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--navy-900, #102238); }
    .panel-title .material-icons { color: #b8862c; }
    .mini-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; border-top: 1px solid var(--line, #e4d8c8); color: var(--text-main, #15243a); }
    .mini-row span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mini-row strong { white-space: nowrap; }
    .status-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; background: #eef2f7; color: #475569; font-weight: 700; font-size: 0.78rem; }
    .status-badge[data-status="PAID"] { background: #e8f7ed; color: #16803a; }
    .status-badge[data-status="PENDING"] { background: #fff3d6; color: #9a6a1f; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .budget-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
    .budget-kpi-card {
      display: flex; align-items: center; gap: 14px; padding: 18px;
      border: 1px solid var(--line); border-radius: 12px; background: var(--surface);
    }
    .budget-kpi-card .bk-icon {
      width: 42px; height: 42px; border-radius: 10px; display: grid; place-items: center;
      background: #f0f9ff; color: #0284c7;
    }
    .budget-kpi-card.budgeted .bk-icon { background: #e0f2fe; color: #0284c7; }
    .budget-kpi-card.actual .bk-icon { background: #fce7f3; color: #db2777; }
    .budget-kpi-card.over .bk-icon, .budget-kpi-card.utilization.over .bk-icon { background: #fef2f2; color: #dc2626; }
    .budget-kpi-card.utilization.warn .bk-value { color: #d97706; }
    .bk-value { font-size: 1.45rem; font-weight: 800; color: var(--navy-900); line-height: 1.1; }
    .bk-label { font-size: 0.82rem; color: var(--text-muted); margin-top: 4px; }
    .num-col { text-align: end; }
    .center-col { text-align: center; }
    .positive { color: #16803a; font-weight: 600; }
    .negative { color: #d32f2f; font-weight: 600; }
    .over-row { background: #fff5f5; }
    .status-badge.badge-ok { background: #e8f7ed; color: #16803a; }
    .status-badge.badge-over { background: #fdecea; color: #d32f2f; }
    @media (max-width: 1100px) {
      .finance-stat-grid, .quick-actions-grid, .budget-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .finance-overview, .ledger-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 680px) {
      .finance-stat-grid, .quick-actions-grid, .budget-kpi-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class FinanceWorkspaceComponent implements OnInit {
  section = 'dashboard';
  dashboard?: FinanceDashboardDto;
  expenses: ExpenseItem[] = [];
  revenues: RevenueItem[] = [];
  budgets: BudgetItem[] = [];
  properties: Property[] = [];
  selectedPropertyId: number | null = null;
  budgetYear = new Date().getFullYear();
  budgetLoading = false;
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
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    readonly permissions: PermissionService
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

  get dashboardCards(): Array<{ label: string; value: string; icon: string }> {
    const d = this.dashboard;
    if (!d) return [];
    return [
      { label: this.translate.instant('FINANCE.MONTHLY_REVENUE'), value: this.format(d.thisMonthCollected), icon: 'south_west' },
      { label: this.translate.instant('FINANCE.MONTHLY_EXPENSES'), value: this.format(d.thisMonthExpenses), icon: 'north_east' },
      { label: this.translate.instant('FINANCE.NET_INCOME'), value: this.format(d.netIncome), icon: 'account_balance_wallet' },
      { label: this.translate.instant('FINANCE.OVERDUE_RENT'), value: this.format(d.overdueAmount), icon: 'warning_amber' }
    ];
  }

  get showEmptyState(): boolean {
    if (this.section === 'dashboard') return !this.dashboardCards.length;
    if (this.section === 'expenses') return !this.expenses.length;
    if (this.section === 'revenues') return !this.revenues.length;
    if (this.section === 'budget') return !this.budgetLoading && !this.budgets.length;
    return false;
  }

  get budgetTotals(): { budgeted: number; actual: number; variance: number; utilization: number } {
    const budgeted = this.budgets.reduce((sum, row) => sum + (row.budgetedAmount || 0), 0);
    const actual = this.budgets.reduce((sum, row) => sum + (row.actualAmount || 0), 0);
    const variance = budgeted - actual;
    const utilization = budgeted > 0 ? (actual / budgeted) * 100 : 0;
    return { budgeted, actual, variance, utilization };
  }

  get budgetYearLovOptions(): EstateLovOption[] {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => {
      const year = current - i;
      return { value: year, label: String(year) };
    });
  }

  get pagedExpenses(): ExpenseItem[] { return this.pageSlice(this.expenses, this.expensesPageIndex); }
  get pagedRevenues(): RevenueItem[] { return this.pageSlice(this.revenues, this.revenuesPageIndex); }
  get pagedBudgets(): BudgetItem[] { return this.pageSlice(this.budgets, this.budgetPageIndex); }

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

  onBudgetYearChange(): void {
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
      this.loadRecentFinanceItems(propertyId);
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
      this.budgetLoading = true;
      this.service.getBudgets(propertyId, this.budgetYear).subscribe({
        next: (res) => {
          this.budgets = res.data ?? [];
          this.budgetLoading = false;
        },
        error: () => {
          this.budgets = [];
          this.budgetLoading = false;
          this.snack.error('FINANCE.BUDGET_LOAD_FAILED');
        }
      });
    }
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'dashboard';
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; },
      error: () => {}
    });
    this.loadSection();
  }

  propertyLabel(p: Property): string {
    const ar = (p.propertyNameAr ?? '').trim();
    const en = (p.propertyNameEn ?? '').trim();
    const fallback = (p.propertyName ?? '').trim();
    const name = this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${p.id}`)
      : (en || ar || fallback || `#${p.id}`);
    return p.propertyCode ? `${p.propertyCode} — ${name}` : name;
  }

  get propertyLovOptions(): EstateLovOption[] {
    return this.properties.map((p) => ({
      value: p.id,
      label: this.propertyLabel(p)
    }));
  }

  get expenseExportColumns(): ExportColumn<ExpenseItem>[] {
    return [
      { header: '#', value: 'expenseNumber' },
      { header: this.translate.instant('FINANCE.DESCRIPTION_COL'), value: (row) => this.expenseDescription(row) },
      { header: this.translate.instant('FINANCE.AMOUNT_COL'), value: 'amount' },
      { header: this.translate.instant('COMMON.OMR'), value: (row) => this.currencyLabel(row.currency) },
      { header: this.translate.instant('FINANCE.DATE_COL'), value: (row) => this.formatDate(row.expenseDate) },
      { header: this.translate.instant('FINANCE.STATUS_COL'), value: (row) => this.statusLabel(row.status) }
    ];
  }

  get revenueExportColumns(): ExportColumn<RevenueItem>[] {
    return [
      { header: '#', value: 'revenueNumber' },
      { header: this.translate.instant('FINANCE.DESCRIPTION_COL'), value: (row) => this.revenueDescription(row) },
      { header: this.translate.instant('FINANCE.AMOUNT_COL'), value: 'amount' },
      { header: this.translate.instant('COMMON.OMR'), value: (row) => this.currencyLabel(row.currency) },
      { header: this.translate.instant('FINANCE.DATE_COL'), value: (row) => this.formatDate(row.revenueDate) }
    ];
  }

  get budgetExportColumns(): ExportColumn<BudgetItem>[] {
    return [
      { header: this.translate.instant('REQUEST_FORM.PROPERTY'), value: (row) => row.propertyName || '-' },
      { header: this.translate.instant('FINANCE.CATEGORY_COL'), value: (row) => this.budgetCategoryLabel(row) },
      { header: this.translate.instant('FINANCE.PERIOD_COL'), value: (row) => row.periodName || String(this.budgetYear) },
      { header: this.translate.instant('FINANCE.BUDGET_COL'), value: 'budgetedAmount' },
      { header: this.translate.instant('FINANCE.ACTUAL_COL'), value: (row) => row.actualAmount ?? 0 },
      { header: this.translate.instant('FINANCE.VARIANCE_COL'), value: (row) => row.variance ?? 0 },
      { header: this.translate.instant('FINANCE.UTILIZATION'), value: (row) => row.utilizationPercent ?? 0 }
    ];
  }

  budgetCategoryLabel(item: BudgetItem): string {
    if (this.isArabic) {
      return item.categoryNameAr || item.categoryName || '-';
    }
    return item.categoryNameEn || item.categoryName || '-';
  }

  statusLabel(status?: string): string {
    const normalized = status || 'PENDING';
    const fallback: Record<string, string> = this.isArabic
      ? { PENDING: 'قيد الانتظار', PAID: 'مدفوع', CANCELLED: 'ملغي', APPROVED: 'معتمد' }
      : { PENDING: 'Pending', PAID: 'Paid', CANCELLED: 'Cancelled', APPROVED: 'Approved' };
    const key = `STATUS.${normalized}`;
    const label = this.translate.instant(key);
    return label === key ? (fallback[normalized] || normalized) : label;
  }

  format(value = 0): string {
    return `${this.i18n.formatNumber(value, { maximumFractionDigits: 0 })} ${this.translate.instant('COMMON.OMR')}`;
  }

  currencyLabel(currency?: string): string {
    const value = currency || 'SAR';
    if (value === 'SAR') return this.translate.instant('COMMON.OMR');
    return value;
  }

  expenseDescription(item: ExpenseItem): string {
    const description = item.description || item.expenseNumber || '-';
    const match = description.match(/^Maintenance contract invoice\s+(.+)$/i);
    if (match) {
      return this.isArabic
        ? `فاتورة عقد صيانة ${match[1]}`
        : `Maintenance contract invoice ${match[1]}`;
    }
    return description;
  }

  revenueDescription(item: RevenueItem): string {
    return item.description || item.revenueNumber || '-';
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

  private loadRecentFinanceItems(propertyId?: number): void {
    const params: Record<string, string | number> = { page: 0, size: 4 };
    if (propertyId) params['propertyId'] = propertyId;
    this.service.getExpenses(params).subscribe({
      next: (res) => { this.expenses = res.data?.content ?? []; },
      error: () => { this.expenses = []; }
    });
    this.service.getRevenues(params).subscribe({
      next: (res) => { this.revenues = res.data?.content ?? []; },
      error: () => { this.revenues = []; }
    });
  }
}
