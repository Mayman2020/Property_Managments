import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { ReportsService, OccupancyAnalytics, PropertyOccupancy } from '../../../../core/services/reports.service';
import { PropertyService, Property } from '../../../../core/services/property.service';
import { SnackService } from '../../../../core/services/snack.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../../shared/components/table-pager/table-pager.component';

@Component({
  selector: 'app-occupancy-analytics',
  standalone: true,
  imports: [
    NgIf, NgFor, DecimalPipe, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, TranslateModule,
    PageHeaderComponent, TablePagerComponent,
  ],
  template: `
    <app-page-header
      [title]="('INLINE_TEXT.OCCUPANCY_ANALYTICS' | translate)"
      [subtitle]="('INLINE_TEXT.UNIT_OCCUPANCY_RATES_PER_PROPERTY' | translate)">
    </app-page-header>

    <div class="page-body">
      <div class="finance-filter-strip" *ngIf="properties.length">
        <label>{{ ('INLINE_TEXT.PROPERTY' | translate) }}</label>
        <select [(ngModel)]="filterPropertyId" (change)="load()" class="estate-property-select">
          <option [ngValue]="null">{{ ('INLINE_TEXT.ALL' | translate) }}</option>
          <option *ngFor="let p of properties" [ngValue]="p.id">
            {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
          </option>
        </select>
        <button mat-icon-button (click)="load()" [matTooltip]="('INLINE_TEXT.REFRESH' | translate)" style="margin-inline-start:auto">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading && data">
        <!-- Global KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#e0f2fe"><mat-icon style="color:#0284c7">home</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.totalUnits }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.TOTAL_UNITS' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#dcfce7"><mat-icon style="color:#16a34a">check_circle</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.rentedUnits }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.RENTED_UNITS' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#fef3c7"><mat-icon style="color:#d97706">circle</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.vacantUnits }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.VACANT_UNITS' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#f3e8ff"><mat-icon style="color:#9333ea">percent</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.occupancyRate | number:'1.1-1' }}%</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.OCCUPANCY_RATE' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#fce7f3"><mat-icon style="color:#db2777">payments</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.totalMonthlyRent | number:'1.0-0' }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.TOTAL_MONTHLY_RENT' | translate) }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#f0fdf4"><mat-icon style="color:#22c55e">trending_up</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-number">{{ data.averageMonthlyRent | number:'1.0-0' }}</div>
              <div class="kpi-label">{{ ('INLINE_TEXT.AVG_MONTHLY_RENT' | translate) }}</div>
            </div>
          </div>
        </div>

        <!-- Occupancy Bar per Property -->
        <div class="section-title">{{ ('INLINE_TEXT.BREAKDOWN_BY_PROPERTY' | translate) }}</div>
        <div class="property-bars">
          <div *ngFor="let prop of pagedByProperty" class="property-bar-item">
            <div class="prop-header">
              <span class="prop-name">{{ prop.propertyName }}</span>
              <span class="prop-rate" [class.low]="prop.occupancyRate < 50" [class.medium]="prop.occupancyRate >= 50 && prop.occupancyRate < 80">
                {{ prop.occupancyRate | number:'1.1-1' }}%
              </span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="prop.occupancyRate"
                   [class.low-fill]="prop.occupancyRate < 50"
                   [class.medium-fill]="prop.occupancyRate >= 50 && prop.occupancyRate < 80">
              </div>
            </div>
            <div class="prop-meta">
              <span>{{ prop.rentedUnits }}/{{ prop.totalUnits }} {{ ('INLINE_TEXT.UNITS' | translate) }}</span>
              <span>{{ ('INLINE_TEXT.MONTHLY' | translate) }} {{ prop.totalMonthlyRent | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>
        <app-table-pager
          *ngIf="(data.byProperty?.length ?? 0) > pageSize"
          [length]="data.byProperty?.length ?? 0"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (pageIndexChange)="pageIndex = $event">
        </app-table-pager>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-body { padding: 16px 24px; }
    .loading-center { display: flex; justify-content: center; padding: 60px 0; }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      margin: 0 0 16px; padding: 12px 16px;
      border: 1px solid var(--line, #e4d8c8); background: var(--surface, #fffdf8); border-radius: 8px;
    }
    .finance-filter-strip label { color: var(--text-muted); font-weight: 700; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .kpi-card {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .kpi-icon { padding: 10px; border-radius: 10px; display: flex; }
    .kpi-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .kpi-number { font-size: 22px; font-weight: 700; color: #111827; }
    .kpi-label { font-size: 12px; color: #6b7280; margin-top: 2px; }

    .section-title { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 14px; }

    .property-bars { display: flex; flex-direction: column; gap: 20px; }
    .property-bar-item {
      background: #fff;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      padding: 16px 20px;
    }
    .prop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .prop-name { font-size: 14px; font-weight: 600; color: #111827; }
    .prop-rate { font-size: 16px; font-weight: 700; color: #16a34a; }
    .prop-rate.medium { color: #d97706; }
    .prop-rate.low { color: #dc2626; }

    .bar-track { background: #f3f4f6; border-radius: 8px; height: 10px; overflow: hidden; margin-bottom: 8px; }
    .bar-fill { height: 100%; border-radius: 8px; background: #16a34a; transition: width 0.5s ease; }
    .bar-fill.medium-fill { background: #d97706; }
    .bar-fill.low-fill { background: #dc2626; }

    .prop-meta { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
  `]
})
export class OccupancyAnalyticsComponent implements OnInit {
  data: OccupancyAnalytics | null = null;
  properties: Property[] = [];
  loading = true;
  filterPropertyId: number | null = null;
  readonly pageSize = 6;
  pageIndex = 0;

  get pagedByProperty(): PropertyOccupancy[] {
    const rows = this.data?.byProperty ?? [];
    const start = this.pageIndex * this.pageSize;
    return rows.slice(start, start + this.pageSize);
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
    this.pageIndex = 0;
    this.reportsService.getOccupancy(this.filterPropertyId ?? undefined).subscribe({
      next: (res) => { this.data = res.data ?? null; this.loading = false; },
      error: () => { this.loading = false; this.snack.error('INLINE_TEXT.FAILED_TO_LOAD_REPORT'); }
    });
  }
}
