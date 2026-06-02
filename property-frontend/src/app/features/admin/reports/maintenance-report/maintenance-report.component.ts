import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { ReportsService, MaintenanceReport, MaintenanceReportRequest } from '../../../../core/services/reports.service';
import { PropertyService, Property } from '../../../../core/services/property.service';
import { SnackService } from '../../../../core/services/snack.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../../shared/components/estate-lov-select/estate-lov-select.component';

@Component({
  selector: 'app-maintenance-report',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, DecimalPipe, FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    TranslateModule, PageHeaderComponent, EstateLovSelectComponent
  ],
  template: `
    <app-page-header
      [title]="('INLINE_TEXT.MAINTENANCE_REPORT' | translate)"
      [subtitle]="('INLINE_TEXT.MAINTENANCE_REQUESTS_ANALYSIS_AND_COSTS' | translate)">
    </app-page-header>

    <div class="page-body">
      <div class="finance-filter-strip">
        <app-estate-lov-select
          [label]="'INLINE_TEXT.PROPERTY'"
          [options]="propertyLovOptions"
          [showAll]="true"
          allLabelKey="INLINE_TEXT.ALL"
          [(ngModel)]="filterPropertyId"
          (ngModelChange)="load()">
        </app-estate-lov-select>
        <button
          mat-icon-button
          type="button"
          class="clear-filters-btn"
          (click)="resetFilters()"
          [matTooltip]="'ACTIONS.CLEAR_FILTERS' | translate"
          [attr.aria-label]="'ACTIONS.CLEAR_FILTERS' | translate">
          <mat-icon>filter_alt_off</mat-icon>
        </button>
      </div>

      <div *ngIf="loading" class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading && data">
        <!-- KPI Cards -->
        <div class="kpi-grid">
          <button type="button" class="kpi-card total" (click)="openDetails('total')" [matTooltip]="detailsTooltip('total')">
            <mat-icon>build</mat-icon>
            <div class="kpi-number">{{ data.totalRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.TOTAL_REQUESTS' | translate) }}</div>
          </button>
          <button type="button" class="kpi-card open" (click)="openDetails('open')" [matTooltip]="detailsTooltip('open')">
            <mat-icon>folder_open</mat-icon>
            <div class="kpi-number">{{ data.openRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.OPEN' | translate) }}</div>
          </button>
          <button type="button" class="kpi-card in-progress" (click)="openDetails('inProgress')" [matTooltip]="detailsTooltip('inProgress')">
            <mat-icon>engineering</mat-icon>
            <div class="kpi-number">{{ data.inProgressRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.IN_PROGRESS' | translate) }}</div>
          </button>
          <button type="button" class="kpi-card completed" (click)="openDetails('completed')" [matTooltip]="detailsTooltip('completed')">
            <mat-icon>task_alt</mat-icon>
            <div class="kpi-number">{{ data.completedRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.COMPLETED' | translate) }}</div>
          </button>
          <button type="button" class="kpi-card cancelled" (click)="openDetails('cancelled')" [matTooltip]="detailsTooltip('cancelled')">
            <mat-icon>cancel</mat-icon>
            <div class="kpi-number">{{ data.cancelledRequests }}</div>
            <div class="kpi-label">{{ ('INLINE_TEXT.CANCELLED' | translate) }}</div>
          </button>
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

    <div class="modal-backdrop" *ngIf="selectedCard" (click)="closeDetails()"></div>
    <section class="details-dialog" *ngIf="selectedCard">
      <header class="dialog-header">
        <div>
          <span>{{ 'INLINE_TEXT.MAINTENANCE_REPORT' | translate }}</span>
          <h3>{{ selectedTitle }}</h3>
        </div>
        <button
          mat-icon-button
          type="button"
          (click)="closeDetails()"
          [matTooltip]="'ACTIONS.CLOSE' | translate"
          [attr.aria-label]="'ACTIONS.CLOSE' | translate">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="dialog-body">
        <div class="request-detail-card" *ngFor="let req of selectedRequests">
          <div class="request-card-head">
            <span class="request-number">{{ req.requestNumber || ('#' + req.id) }}</span>
            <span class="status-pill" [ngClass]="statusClass(req.status)">{{ statusLabel(req.status || '') }}</span>
          </div>
          <h4>{{ req.title || '-' }}</h4>
          <p>{{ req.description || '-' }}</p>
          <div class="detail-grid">
            <div>
              <span>{{ 'INLINE_TEXT.PROPERTY' | translate }}</span>
              <strong>{{ requestPropertyName(req) }}</strong>
            </div>
            <div>
              <span>{{ 'REQUEST_LIST.UNIT' | translate }}</span>
              <strong>{{ req.unitNumber || '-' }}</strong>
            </div>
            <div>
              <span>{{ 'REQUEST_LIST.TENANT' | translate }}</span>
              <strong>{{ requestTenantName(req) }}</strong>
            </div>
            <div>
              <span>{{ 'REQUEST_LIST.CREATED_AT' | translate }}</span>
              <strong>{{ req.createdAt ? (req.createdAt | date:'dd/MM/yyyy') : '-' }}</strong>
            </div>
            <div>
              <span>{{ 'MAINTENANCE.PRIORITY' | translate }}</span>
              <strong>{{ priorityLabel(req.priority) }}</strong>
            </div>
            <div>
              <span>{{ 'MAINTENANCE.SLA_DEADLINE' | translate }}</span>
              <strong>{{ req.slaDeadline ? (req.slaDeadline | date:'dd/MM/yyyy HH:mm') : '-' }}</strong>
            </div>
          </div>
        </div>

        <div class="dialog-empty" *ngIf="selectedRequests.length === 0">
          <mat-icon>inbox</mat-icon>
          <span>{{ 'COMMON.NO_DATA' | translate }}</span>
        </div>
      </div>
    </section>
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

    .clear-filters-btn { color: var(--navy-800, #0f2238); background: rgba(15,34,56,0.06); }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 180px));
      justify-content: center;
      gap: 16px;
      margin: 0 auto 24px;
      max-width: 980px;
    }
    .kpi-card {
      border: 0;
      border-radius: 12px;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15, 34, 56, 0.12); }
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
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.42); z-index: 1000; }
    .details-dialog {
      position: fixed;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      width: min(920px, calc(100vw - 48px));
      max-height: min(760px, calc(100vh - 48px));
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
      z-index: 1001;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
      direction: rtl;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px;
      background: var(--navy-900, #10243a);
      color: #fff;
    }
    .dialog-header span { display: block; font-size: 12px; opacity: 0.74; margin-bottom: 4px; }
    .dialog-header h3 { margin: 0; font-size: 1.25rem; }
    .dialog-body { padding: 18px; overflow: auto; display: grid; gap: 12px; background: #f8f5ef; }
    .request-detail-card {
      background: #fff;
      border: 1px solid #e7dccb;
      border-radius: 10px;
      padding: 16px;
      display: grid;
      gap: 12px;
    }
    .request-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .request-number { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #475569; font-weight: 700; }
    .request-detail-card h4 { margin: 0; font-size: 1rem; color: var(--navy-900, #10243a); }
    .request-detail-card p { margin: 0; color: #64748b; line-height: 1.7; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
    .detail-grid div { border: 1px solid #eee4d7; border-radius: 8px; padding: 10px; background: #fffaf3; }
    .detail-grid span { display: block; color: #64748b; font-size: 12px; margin-bottom: 6px; }
    .detail-grid strong { color: #0f172a; }
    .status-pill { border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; background: #e2e8f0; color: #334155; }
    .status-pill.open { background: #ffedd5; color: #c2410c; }
    .status-pill.progress { background: #dbeafe; color: #1d4ed8; }
    .status-pill.completed { background: #dcfce7; color: #15803d; }
    .status-pill.cancelled { background: #f1f5f9; color: #64748b; }
    .dialog-empty { display: grid; place-items: center; gap: 8px; color: #64748b; padding: 42px; }
  `]
})
export class MaintenanceReportComponent implements OnInit {
  data: MaintenanceReport | null = null;
  properties: Property[] = [];
  loading = true;
  filterPropertyId: number | null = null;
  selectedCard: 'total' | 'open' | 'inProgress' | 'completed' | 'cancelled' | null = null;

  get propertyLovOptions(): EstateLovOption[] {
    return this.properties.map((p) => ({
      value: p.id,
      label: this.propertyLovLabel(p)
    }));
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
    this.reportsService.getMaintenanceReport(this.filterPropertyId ?? undefined).subscribe({
      next: (res) => { this.data = res.data ?? null; this.loading = false; },
      error: () => { this.loading = false; this.snack.error('INLINE_TEXT.FAILED_TO_LOAD_REPORT'); }
    });
  }

  resetFilters(): void {
    this.filterPropertyId = null;
    this.closeDetails();
    this.load();
  }

  openDetails(card: 'total' | 'open' | 'inProgress' | 'completed' | 'cancelled'): void {
    this.selectedCard = card;
  }

  closeDetails(): void {
    this.selectedCard = null;
  }

  get selectedRequests(): MaintenanceReportRequest[] {
    const requests = this.data?.requests ?? [];
    switch (this.selectedCard) {
      case 'open':
        return requests.filter((r) => r.status === 'OPEN');
      case 'inProgress':
        return requests.filter((r) => ['IN_PROGRESS', 'ASSIGNED', 'SCHEDULED'].includes(r.status || ''));
      case 'completed':
        return requests.filter((r) => r.status === 'COMPLETED');
      case 'cancelled':
        return requests.filter((r) => r.status === 'CANCELLED');
      case 'total':
        return requests;
      default:
        return [];
    }
  }

  get selectedTitle(): string {
    const map: Record<string, string> = {
      total: this.i18n.instant('INLINE_TEXT.TOTAL_REQUESTS'),
      open: this.i18n.instant('INLINE_TEXT.OPEN'),
      inProgress: this.i18n.instant('INLINE_TEXT.IN_PROGRESS'),
      completed: this.i18n.instant('INLINE_TEXT.COMPLETED'),
      cancelled: this.i18n.instant('INLINE_TEXT.CANCELLED')
    };
    return this.selectedCard ? map[this.selectedCard] : '';
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`) || status;
  }

  priorityLabel(priority?: string): string {
    if (!priority) return '-';
    const translated = this.i18n.instant(`PRIORITY.${priority}`);
    return translated !== `PRIORITY.${priority}` ? translated : priority;
  }

  detailsTooltip(card: 'total' | 'open' | 'inProgress' | 'completed' | 'cancelled'): string {
    const label = {
      total: this.i18n.instant('INLINE_TEXT.TOTAL_REQUESTS'),
      open: this.i18n.instant('INLINE_TEXT.OPEN'),
      inProgress: this.i18n.instant('INLINE_TEXT.IN_PROGRESS'),
      completed: this.i18n.instant('INLINE_TEXT.COMPLETED'),
      cancelled: this.i18n.instant('INLINE_TEXT.CANCELLED')
    }[card];
    return `${this.i18n.instant('ACTIONS.DETAILS')} - ${label}`;
  }

  requestPropertyName(req: MaintenanceReportRequest): string {
    return this.i18n.currentLang === 'ar'
      ? (req.propertyNameAr || req.propertyNameEn || req.propertyName || '-')
      : (req.propertyNameEn || req.propertyNameAr || req.propertyName || '-');
  }

  requestTenantName(req: MaintenanceReportRequest): string {
    return this.i18n.currentLang === 'ar'
      ? (req.tenantNameAr || req.tenantNameEn || req.tenantName || '-')
      : (req.tenantNameEn || req.tenantNameAr || req.tenantName || '-');
  }

  statusClass(status?: string): string {
    if (status === 'OPEN') return 'open';
    if (['IN_PROGRESS', 'ASSIGNED', 'SCHEDULED'].includes(status || '')) return 'progress';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'CANCELLED') return 'cancelled';
    return '';
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

  private propertyLovLabel(p: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
    return p.propertyCode ? `${p.propertyCode} — ${name}` : name;
  }
}
