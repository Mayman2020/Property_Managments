import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { ReportsService, MaintenanceReport } from '../../../../core/services/reports.service';
import { PropertyService, Property } from '../../../../core/services/property.service';
import { SnackService } from '../../../../core/services/snack.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-maintenance-report',
  standalone: true,
  imports: [
    NgIf, NgFor, DecimalPipe, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule, PageHeaderComponent
  ],
  template: `
    <app-page-header
      [title]="('INLINE_TEXT.MAINTENANCE_REPORT' | translate)"
      [subtitle]="('INLINE_TEXT.MAINTENANCE_REQUESTS_ANALYSIS_AND_COSTS' | translate)">
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
        <button mat-icon-button (click)="load()"><mat-icon>refresh</mat-icon></button>
      </div>

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading && data">
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card total">
            <mat-icon>build</mat-icon>
            <div class="kpi-number">{{ data.totalRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.TOTAL_REQUESTS' | translate) }}</div>
          </div>
          <div class="kpi-card open">
            <mat-icon>folder_open</mat-icon>
            <div class="kpi-number">{{ data.openRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.OPEN' | translate) }}</div>
          </div>
          <div class="kpi-card in-progress">
            <mat-icon>engineering</mat-icon>
            <div class="kpi-number">{{ data.inProgressRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.IN_PROGRESS' | translate) }}</div>
          </div>
          <div class="kpi-card completed">
            <mat-icon>task_alt</mat-icon>
            <div class="kpi-number">{{ data.completedRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.COMPLETED' | translate) }}</div>
          </div>
          <div class="kpi-card cancelled">
            <mat-icon>cancel</mat-icon>
            <div class="kpi-number">{{ data.cancelledRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.CANCELLED' | translate) }}</div>
          </div>
        </div>

        <!-- Status Breakdown Chart (simple bars) -->
        <div class="section-card" *ngIf="data.byStatus.length > 0">
          <div class="section-title">{{ ('INLINE_TEXT.STATUS_DISTRIBUTION' | translate) }}</div>
          <div class="status-bars">
            <div *ngFor="let s of data.byStatus" class="status-bar-row">
              <span class="status-label">{{ statusLabel(s.status) }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="data.totalRequests > 0 ? (s.count / data.totalRequests * 100) : 0"
                     [style.background]="statusColor(s.status)">
                </div>
              </div>
              <span class="status-count">{{ s.count }}</span>
            </div>
          </div>
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

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi-card {
      border-radius: 12px;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    .kpi-card mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .kpi-number { font-size: 26px; font-weight: 700; }
    .kpi-label { font-size: 12px; opacity: 0.8; }
    .kpi-card.total { background: #f0f9ff; color: #0369a1; }
    .kpi-card.open { background: #fff7ed; color: #c2410c; }
    .kpi-card.in-progress { background: #fef9c3; color: #a16207; }
    .kpi-card.completed { background: #f0fdf4; color: #15803d; }
    .kpi-card.cancelled { background: #f9fafb; color: #6b7280; }

    .section-card { background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 16px; }

    .status-bars { display: flex; flex-direction: column; gap: 14px; }
    .status-bar-row { display: flex; align-items: center; gap: 12px; }
    .status-label { width: 120px; font-size: 13px; color: #374151; flex-shrink: 0; }
    .bar-track { flex: 1; background: #f3f4f6; border-radius: 6px; height: 12px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; min-width: 4px; transition: width 0.4s; }
    .status-count { width: 40px; text-align: end; font-size: 13px; font-weight: 600; color: #111827; }
  `]
})
export class MaintenanceReportComponent implements OnInit {
  data: MaintenanceReport | null = null;
  properties: Property[] = [];
  loading = true;
  filterPropertyId: number | null = null;

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
    this.reportsService.getMaintenanceReport(this.filterPropertyId ?? undefined).subscribe({
      next: (res) => { this.data = res.data ?? null; this.loading = false; },
      error: () => { this.loading = false; this.snack.error('Failed to load report'); }
    });
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`) || status;
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      OPEN: '#f97316',
      ASSIGNED: '#eab308',
      IN_PROGRESS: '#3b82f6',
      SCHEDULED: '#8b5cf6',
      COMPLETED: '#22c55e',
      CANCELLED: '#9ca3af',
    };
    return map[status] ?? '#6b7280';
  }
}
