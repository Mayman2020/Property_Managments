import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { AuditLogItem, AuditService } from '../../../core/services/audit.service';

const ACTION_TYPES = [
  'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT',
  'ACTIVATE', 'DEACTIVATE', 'APPROVE', 'REJECT',
  'PAYMENT_RECORD', 'STATUS_CHANGE', 'EXPORT', 'PRINT'
];

const ENTITY_TYPES = [
  'EMPLOYEE', 'CONTRACT', 'UNIT', 'PROPERTY', 'TENANT',
  'USER', 'PAYMENT', 'MAINTENANCE', 'PAYROLL', 'LEAVE'
];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, TranslateModule,
    MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, FilterBarComponent, TablePagerComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [eyebrow]="'NAV.AUDIT_LOG' | translate"
        [title]="'AUDIT.TITLE' | translate"
        [subtitle]="'AUDIT.SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.DASHBOARD' | translate), route: '/admin/dashboard' },
          { label: ('NAV.AUDIT_LOG' | translate) }
        ]"
        [showBack]="true"
        (backClick)="goBack()">
      </app-page-header>

      <div class="loading-wrap" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <app-empty-state
        *ngIf="!loading && totalElements === 0 && !hasFiltersBar()"
        icon="history"
        [title]="'AUDIT.EMPTY_TITLE' | translate"
        [message]="'COMMON.NO_DATA' | translate">
      </app-empty-state>

      <section class="app-card directory-table-card" *ngIf="!loading && (totalElements > 0 || hasFiltersBar())">
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top">
            <app-filter-bar
              [filters]="pageFilters"
              [filterValues]="filterValues"
              (filtersChange)="onFilterBarChange($event)">
            </app-filter-bar>
            <button mat-icon-button class="clear-filters-btn" (click)="clearFiltersFromBar()" *ngIf="hasFiltersBar()" [matTooltip]="'ACTIONS.CLEAR_FILTERS' | translate">
              <mat-icon>filter_alt_off</mat-icon>
            </button>
          </div>
        </div>

        <div class="app-table-wrap" *ngIf="logs.length">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'AUDIT.USER' | translate }}</th>
                <th>{{ 'AUDIT.ACTION' | translate }}</th>
                <th>{{ 'AUDIT.ENTITY' | translate }}</th>
                <th>{{ 'AUDIT.DETAILS' | translate }}</th>
                <th>{{ 'AUDIT.TIMESTAMP' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of logs">
                <td>{{ item.userName || 'System' }}</td>
                <td><span class="status-badge" data-status="INFO">{{ item.action }}</span></td>
                <td>{{ item.entityType }} <span class="td-mono" *ngIf="item.entityId">#{{ item.entityId }}</span></td>
                <td>{{ item.entityLabel || item.notes || '—' }}</td>
                <td>{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-empty-state
          *ngIf="!logs.length && hasFiltersBar()"
          icon="history"
          [message]="'COMMON.NO_DATA' | translate">
        </app-empty-state>

        <app-table-pager
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageIndex]="page"
          (pageIndexChange)="onPageIndexChange($event)">
        </app-table-pager>
      </section>
    </div>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 60px 0; }
  `]
})
export class AuditLogComponent implements OnInit {
  logs: AuditLogItem[] = [];
  loading = false;
  page = 0;
  readonly pageSize = 5;
  totalElements = 0;
  pageFilters: FilterSpec[] = [];
  filterValues: Record<string, unknown> = { action: null, entityType: null };

  constructor(
    private readonly service: AuditService,
    private readonly translate: TranslateService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    this.buildFilters();
    this.load();
  }

  goBack(): void {
    this.location.back();
  }

  hasFiltersBar(): boolean {
    return !!(this.filterValues['action'] || this.filterValues['entityType']);
  }

  onFilterBarChange(values: Record<string, unknown>): void {
    this.filterValues = { ...values };
    this.page = 0;
    this.load();
  }

  clearFiltersFromBar(): void {
    this.filterValues = { action: null, entityType: null };
    this.page = 0;
    this.load();
  }

  onPageIndexChange(index: number): void {
    this.page = index;
    this.load();
  }

  private buildFilters(): void {
    this.pageFilters = [
      {
        key: 'action',
        label: 'AUDIT.ACTION',
        type: 'select',
        options: ACTION_TYPES.map((a) => ({
          value: a,
          label: this.translate.instant('AUDIT.ACTION_TYPES.' + a)
        }))
      },
      {
        key: 'entityType',
        label: 'AUDIT.ENTITY',
        type: 'select',
        options: ENTITY_TYPES.map((e) => ({
          value: e,
          label: this.translate.instant('AUDIT.ENTITY_TYPES.' + e)
        }))
      }
    ];
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: this.page, size: this.pageSize };
    const action = this.filterValues['action'] as string | null;
    const entityType = this.filterValues['entityType'] as string | null;
    if (action) params['action'] = action;
    if (entityType) params['entityType'] = entityType;
    this.service.getLogs(params).subscribe({
      next: (res) => {
        this.logs = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? this.logs.length;
        this.loading = false;
      },
      error: () => {
        this.logs = [];
        this.totalElements = 0;
        this.loading = false;
      }
    });
  }
}
