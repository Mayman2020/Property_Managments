import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { ReportsService, BudgetVsActual } from '../../../../core/services/reports.service';
import { PropertyService, Property } from '../../../../core/services/property.service';
import { SnackService } from '../../../../core/services/snack.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-budget-vs-actual',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DecimalPipe, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent, EmptyStateComponent
  ],
  template: `
    <app-page-header
      [title]="('INLINE_TEXT.BUDGET_VS_ACTUAL' | translate)"
      [subtitle]="('INLINE_TEXT.PLANNED_BUDGET_COMPARED_TO_ACTUAL_EXPENSES' | translate)">
    </app-page-header>

    <div class="page-body">
      <div class="finance-filter-strip">
        <label>{{ 'INLINE_TEXT.PROPERTY' | translate }}</label>
        <select [(ngModel)]="filterPropertyId" (change)="load()" class="estate-property-select">
          <option [ngValue]="null">{{ 'INLINE_TEXT.ALL' | translate }}</option>
          <option *ngFor="let p of properties" [ngValue]="p.id">
            {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
          </option>
        </select>

        <label>{{ 'INLINE_TEXT.YEAR' | translate }}</label>
        <select [(ngModel)]="filterYear" (change)="load()" class="estate-property-select">
          <option *ngFor="let y of yearOptions" [ngValue]="y">{{ y }}</option>
        </select>

        <button mat-stroked-button (click)="exportCsv()" [disabled]="!data || data.rows.length === 0">
          <mat-icon>download</mat-icon>
          {{ 'INLINE_TEXT.EXPORT_CSV' | translate }}
        </button>
      </div>

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading && data">
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card budgeted">
            <div class="kpi-icon"><mat-icon>account_balance_wallet</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.totalBudgeted | number:'1.0-0' }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.TOTAL_BUDGETED' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card actual">
            <div class="kpi-icon"><mat-icon>payments</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.totalActual | number:'1.0-0' }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.TOTAL_ACTUAL' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card" [class.variance-over]="data.totalVariance < 0" [class.variance-under]="data.totalVariance >= 0">
            <div class="kpi-icon"><mat-icon>{{ data.totalVariance >= 0 ? 'trending_down' : 'trending_up' }}</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ (data.totalVariance < 0 ? -data.totalVariance : data.totalVariance) | number:'1.0-0' }}</div>
              <div class="kpi-label">
                {{ data.totalVariance >= 0
                  ? (('INLINE_TEXT.SAVED' | translate))
                  : (('INLINE_TEXT.OVERSPENT' | translate)) }}
              </div>
            </div>
          </div>
          <div class="kpi-card utilization" [class.util-high]="data.utilizationPercent > 100" [class.util-warn]="data.utilizationPercent > 85 && data.utilizationPercent <= 100">
            <div class="kpi-icon"><mat-icon>donut_large</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.utilizationPercent | number:'1.1-1' }}%</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.UTILIZATION' | translate) }}</div>
            </div>
          </div>
        </div>

        <app-empty-state
          *ngIf="data.rows.length === 0"
          icon="bar_chart"
          [message]="('INLINE_TEXT.NO_BUDGET_DATA_FOR_THIS_PERIOD' | translate)">
        </app-empty-state>

        <!-- Table -->
        <div *ngIf="data.rows.length > 0" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ ('INLINE_TEXT.CATEGORY' | translate) }}</th>
                <th>{{ ('INLINE_TEXT.PROPERTY' | translate) }}</th>
                <th class="num-col">{{ ('INLINE_TEXT.BUDGETED' | translate) }}</th>
                <th class="num-col">{{ ('INLINE_TEXT.ACTUAL' | translate) }}</th>
                <th class="num-col">{{ ('INLINE_TEXT.VARIANCE' | translate) }}</th>
                <th class="num-col">{{ ('INLINE_TEXT.UTILIZATION_2' | translate) }}</th>
                <th class="center-col">{{ ('INLINE_TEXT.STATUS' | translate) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of data.rows" [class.over-row]="row.overBudget">
                <td class="cat-name">{{ i18n.currentLang === 'ar' ? (row.categoryNameAr || row.categoryName) : (row.categoryNameEn || row.categoryName) }}</td>
                <td class="prop-name">{{ row.propertyName || (('INLINE_TEXT.ALL' | translate)) }}</td>
                <td class="num-col">{{ row.budgetedAmount | number:'1.0-0' }}</td>
                <td class="num-col">{{ row.actualAmount | number:'1.0-0' }}</td>
                <td class="num-col" [class.positive]="row.variance >= 0" [class.negative]="row.variance < 0">
                  {{ row.variance >= 0 ? '+' : '' }}{{ row.variance | number:'1.0-0' }}
                </td>
                <td class="num-col">
                  <div class="util-bar-wrap">
                    <div class="util-bar-track">
                      <div class="util-bar-fill"
                           [style.width.%]="row.utilizationPercent > 100 ? 100 : row.utilizationPercent"
                           [class.fill-over]="row.overBudget"
                           [class.fill-warn]="row.utilizationPercent > 85 && !row.overBudget">
                      </div>
                    </div>
                    <span class="util-pct" [class.over-pct]="row.overBudget">{{ row.utilizationPercent | number:'1.1-1' }}%</span>
                  </div>
                </td>
                <td class="center-col">
                  <span class="status-badge" [class.badge-over]="row.overBudget" [class.badge-ok]="!row.overBudget">
                    <mat-icon>{{ row.overBudget ? 'warning' : 'check_circle' }}</mat-icon>
                    {{ row.overBudget
                       ? (('INLINE_TEXT.OVER_BUDGET' | translate))
                       : (('INLINE_TEXT.WITHIN_BUDGET' | translate)) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-body { padding: 16px 24px; }
    .loading-center { display: flex; justify-content: center; padding: 60px 0; }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      margin: 0 0 20px; padding: 12px 14px;
      border-radius: 12px; background: rgba(255,255,255,0.72);
      border: 1px solid var(--line-2, #e4d8c8);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
    }
    .finance-filter-strip label { font-size: 12px; font-weight: 600; color: var(--text-muted); white-space: nowrap; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .kpi-icon { padding: 10px; border-radius: 10px; display: flex; background: #f0f9ff; }
    .kpi-icon mat-icon { font-size: 24px; width: 24px; height: 24px; color: #0369a1; }
    .kpi-number { font-size: 22px; font-weight: 700; color: #111827; }
    .kpi-label { font-size: 12px; color: #6b7280; margin-top: 2px; }

    .kpi-card.budgeted .kpi-icon { background: #e0f2fe; }
    .kpi-card.budgeted .kpi-icon mat-icon { color: #0284c7; }
    .kpi-card.actual .kpi-icon { background: #fce7f3; }
    .kpi-card.actual .kpi-icon mat-icon { color: #db2777; }
    .kpi-card.variance-under .kpi-icon { background: #dcfce7; }
    .kpi-card.variance-under .kpi-icon mat-icon { color: #16a34a; }
    .kpi-card.variance-under .kpi-number { color: #16a34a; }
    .kpi-card.variance-over .kpi-icon { background: #fef2f2; }
    .kpi-card.variance-over .kpi-icon mat-icon { color: #dc2626; }
    .kpi-card.variance-over .kpi-number { color: #dc2626; }
    .kpi-card.utilization .kpi-icon { background: #f3e8ff; }
    .kpi-card.utilization .kpi-icon mat-icon { color: #9333ea; }
    .kpi-card.util-warn .kpi-number { color: #d97706; }
    .kpi-card.util-high .kpi-number { color: #dc2626; }

    .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #e5e7eb; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table th {
      background: #f9fafb;
      padding: 12px 16px;
      text-align: start;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }
    .data-table td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827; }
    .data-table .over-row { background: #fef2f2; }
    .num-col { text-align: end; }
    .center-col { text-align: center; }
    .cat-name { font-weight: 600; }
    .prop-name { color: #6b7280; font-size: 13px; }
    .positive { color: #16a34a; font-weight: 600; }
    .negative { color: #dc2626; font-weight: 600; }

    .util-bar-wrap { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
    .util-bar-track { width: 80px; background: #f3f4f6; border-radius: 4px; height: 8px; overflow: hidden; }
    .util-bar-fill { height: 100%; border-radius: 4px; background: #16a34a; transition: width 0.4s; }
    .util-bar-fill.fill-warn { background: #d97706; }
    .util-bar-fill.fill-over { background: #dc2626; }
    .util-pct { font-size: 12px; font-weight: 600; width: 46px; text-align: start; color: #374151; }
    .util-pct.over-pct { color: #dc2626; }

    .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .status-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .badge-ok { background: #dcfce7; color: #16a34a; }
    .badge-over { background: #fee2e2; color: #dc2626; }
  `]
})
export class BudgetVsActualComponent implements OnInit {
  data: BudgetVsActual | null = null;
  properties: Property[] = [];
  loading = true;
  filterPropertyId: number | null = null;
  filterYear: number = new Date().getFullYear();
  yearOptions: number[] = [];

  constructor(
    private readonly reportsService: ReportsService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 4; y--) {
      this.yearOptions.push(y);
    }
  }

  ngOnInit(): void {
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reportsService.getBudgetVsActual(this.filterPropertyId ?? undefined, this.filterYear).subscribe({
      next: (res) => { this.data = res.data ?? null; this.loading = false; },
      error: () => { this.loading = false; this.snack.error('Failed to load report'); }
    });
  }

  exportCsv(): void {
    if (!this.data) return;
    const ar = this.i18n.currentLang === 'ar';
    const header = ar
      ? ['الفئة', 'العقار', 'الميزانية', 'الفعلي', 'الفرق', 'الاستخدام %', 'الحالة']
      : ['Category', 'Property', 'Budgeted', 'Actual', 'Variance', 'Utilization %', 'Status'];
    const csvRows = this.data.rows.map(r => [
      ar ? (r.categoryNameAr || r.categoryName) : (r.categoryNameEn || r.categoryName),
      r.propertyName || '',
      r.budgetedAmount,
      r.actualAmount,
      r.variance,
      r.utilizationPercent.toFixed(1),
      r.overBudget ? (this.i18n.instant('INLINE_TEXT.OVER_BUDGET')) : (this.i18n.instant('INLINE_TEXT.WITHIN_BUDGET'))
    ]);
    const csv = [header, ...csvRows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-vs-actual-${this.filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
