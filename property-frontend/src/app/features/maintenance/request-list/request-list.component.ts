import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';

import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { RequestTimelineDialogComponent } from '../request-timeline-dialog.component';

export type RequestListContext = 'admin' | 'tenant' | 'officer';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT']);

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, RouterLink, TranslateModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTooltipModule, MatTabsModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent
  ],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss'
})
export class RequestListComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  loading = true;
  filterStatus = '';
  filterPriority = '';
  filterPropertyId: number | null = null;
  searchTerm = '';
  totalElements = 0;
  listContext: RequestListContext = 'admin';
  missingTenantLink = false;
  readonly pageSize = 5;
  adminPageIndex = 0;
  tenantCurrentPageIndex = 0;
  tenantPreviousPageIndex = 0;
  properties: Property[] = [];

  readonly statuses: { value: string; labelKey: string }[] = [
    { value: '', labelKey: 'REQUEST_LIST.ALL_STATUS' },
    { value: 'PENDING', labelKey: 'STATUS.PENDING' },
    { value: 'ASSIGNED', labelKey: 'STATUS.ASSIGNED' },
    { value: 'SCHEDULED', labelKey: 'STATUS.SCHEDULED' },
    { value: 'IN_PROGRESS', labelKey: 'STATUS.IN_PROGRESS' },
    { value: 'COMPLETED', labelKey: 'STATUS.COMPLETED' },
    { value: 'CANCELLED', labelKey: 'STATUS.CANCELLED' },
    { value: 'TENANT_ABSENT', labelKey: 'STATUS.TENANT_ABSENT' },
    { value: 'NEEDS_REVISIT', labelKey: 'STATUS.NEEDS_REVISIT' }
  ];

  readonly priorities = [
    { value: '', labelKey: 'REQUEST_LIST.ALL_PRIORITY' },
    { value: 'LOW', labelKey: 'PRIORITY.LOW' },
    { value: 'NORMAL', labelKey: 'PRIORITY.NORMAL' },
    { value: 'HIGH', labelKey: 'PRIORITY.HIGH' },
    { value: 'URGENT', labelKey: 'PRIORITY.URGENT' }
  ];

  constructor(
    private readonly maintSvc: MaintenanceService,
    readonly i18n: I18nService,
    private readonly route: ActivatedRoute,
    readonly auth: AuthService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data['listContext'];
    if (d === 'tenant' || d === 'officer' || d === 'admin') {
      this.listContext = d;
    }
    if (this.listContext === 'admin') {
      this.propertySvc.getAll(0, 100).subscribe({
        next: (res) => { this.properties = res.data?.content ?? []; }
      });
    }
    this.load();
  }

  get currentRequests(): MaintenanceRequest[] {
    return this.filteredRequests.filter((r) => ACTIVE_STATUSES.has(r.status));
  }

  get previousRequests(): MaintenanceRequest[] {
    return this.filteredRequests.filter((r) => !ACTIVE_STATUSES.has(r.status));
  }

  get activeTenantRequest(): MaintenanceRequest | null {
    return this.currentRequests[0] ?? null;
  }

  get filteredAdminRequests(): MaintenanceRequest[] {
    return this.filteredRequests;
  }

  get pagedAdminRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filteredAdminRequests, this.adminPageIndex);
  }

  get pagedCurrentRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filterBySearch(this.currentRequests), this.tenantCurrentPageIndex);
  }

  get pagedPreviousRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filterBySearch(this.previousRequests), this.tenantPreviousPageIndex);
  }

  load(): void {
    this.loading = true;
    this.missingTenantLink = false;
    const params: Record<string, string | number | boolean> = { page: 0, size: 500 };

    if (this.listContext === 'tenant') {
      const tenantId = this.auth.getCurrentUser()?.tenantId;
      if (tenantId == null) {
        this.requests = [];
        this.totalElements = 0;
        this.missingTenantLink = true;
        this.loading = false;
        return;
      }
      this.maintSvc.getByTenant(tenantId, params).subscribe({
        next: (res) => {
          this.requests = this.sortRequests(res.data?.content ?? []);
          this.totalElements = this.filteredRequests.length;
          this.resetPagerIndexes();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
      return;
    }

    if (this.listContext === 'officer') {
      const officerId = this.auth.getCurrentUser()?.id;
      if (officerId == null) {
        this.loading = false;
        return;
      }
      const mergedParams: Record<string, string | number | boolean> = {
        ...params,
        page: 0,
        size: 500
      };
      forkJoin({
        mine: this.maintSvc.getByOfficer(officerId, mergedParams),
        queue: this.maintSvc.getCompanyQueue(mergedParams)
      }).subscribe({
        next: ({ mine, queue }) => {
          const a = mine.data?.content ?? [];
          const b = queue.data?.content ?? [];
          const map = new Map<number, MaintenanceRequest>();
          for (const r of b) map.set(r.id, r);
          for (const r of a) map.set(r.id, r);
          this.requests = Array.from(map.values()).sort(
            (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
          );
          this.totalElements = this.filteredRequests.length;
          this.resetPagerIndexes();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
      return;
    }

    this.maintSvc.getRequests(params).subscribe({
      next: (res) => {
        this.requests = this.sortRequests(res.data?.content ?? []);
        this.totalElements = this.filteredRequests.length;
        this.resetPagerIndexes();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.totalElements = this.filteredRequests.length;
    this.resetPagerIndexes();
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.totalElements = this.filteredRequests.length;
    this.resetPagerIndexes();
  }

  totalPages(length: number): number {
    return Math.max(1, Math.ceil(length / this.pageSize));
  }

  changeAdminPage(step: number): void {
    this.adminPageIndex = this.clampPage(this.adminPageIndex + step, this.filteredAdminRequests.length);
  }

  changeTenantCurrentPage(step: number): void {
    this.tenantCurrentPageIndex = this.clampPage(this.tenantCurrentPageIndex + step, this.filterBySearch(this.currentRequests).length);
  }

  changeTenantPreviousPage(step: number): void {
    this.tenantPreviousPageIndex = this.clampPage(this.tenantPreviousPageIndex + step, this.filterBySearch(this.previousRequests).length);
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`);
  }

  priorityLabel(priority: string): string {
    return this.i18n.instant(`PRIORITY.${priority}`);
  }

  detailLink(id: number): string[] {
    switch (this.listContext) {
      case 'tenant':
        return ['/tenant/requests', String(id)];
      case 'officer':
        return ['/officer/requests', String(id)];
      default:
        return ['/admin/maintenance', String(id)];
    }
  }

  openTimeline(req: MaintenanceRequest): void {
    this.dialog.open(RequestTimelineDialogComponent, { data: req, width: '560px', panelClass: 'app-dialog-panel' });
  }

  private pageSlice(list: MaintenanceRequest[], pageIndex: number): MaintenanceRequest[] {
    const start = pageIndex * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  private clampPage(nextIndex: number, listLength: number): number {
    const max = this.totalPages(listLength) - 1;
    return Math.max(0, Math.min(nextIndex, max));
  }

  get filteredRequests(): MaintenanceRequest[] {
    return this.applyClientFilters(this.requests);
  }

  filterBySearch(list: MaintenanceRequest[]): MaintenanceRequest[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((req) =>
      [
        req.requestNumber,
        req.title,
        req.description,
        req.propertyName,
        req.unitNumber,
        req.tenantName,
        req.assignedOfficerName
      ].join(' ').toLowerCase().includes(q)
    );
  }

  private applyClientFilters(list: MaintenanceRequest[]): MaintenanceRequest[] {
    return this.filterBySearch(list).filter((req) => {
      if (this.filterStatus && req.status !== this.filterStatus) return false;
      if (this.filterPriority && req.priority !== this.filterPriority) return false;
      if (this.filterPropertyId && req.propertyId !== this.filterPropertyId) return false;
      return true;
    });
  }

  private sortRequests(list: MaintenanceRequest[]): MaintenanceRequest[] {
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private resetPagerIndexes(): void {
    this.adminPageIndex = 0;
    this.tenantCurrentPageIndex = 0;
    this.tenantPreviousPageIndex = 0;
  }
}
