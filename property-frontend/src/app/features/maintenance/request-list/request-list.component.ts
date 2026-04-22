import { Component, OnInit } from '@angular/core';
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

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';

export type RequestListContext = 'admin' | 'tenant' | 'officer';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT']);

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, RouterLink, TranslateModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTooltipModule, MatTabsModule,
    PageHeaderComponent, EmptyStateComponent
  ],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss'
})
export class RequestListComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  loading = true;
  filterStatus = '';
  filterPriority = '';
  totalElements = 0;
  page = 0;
  listContext: RequestListContext = 'admin';
  missingTenantLink = false;

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
    private readonly i18n: I18nService,
    private readonly route: ActivatedRoute,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data['listContext'];
    if (d === 'tenant' || d === 'officer' || d === 'admin') {
      this.listContext = d;
    }
    this.load();
  }

  get currentRequests(): MaintenanceRequest[] {
    return this.requests.filter((r) => ACTIVE_STATUSES.has(r.status));
  }

  get previousRequests(): MaintenanceRequest[] {
    return this.requests.filter((r) => !ACTIVE_STATUSES.has(r.status));
  }

  load(): void {
    this.loading = true;
    this.missingTenantLink = false;
    const params: Record<string, string | number | boolean> = { page: this.page, size: this.listContext === 'tenant' ? 200 : 20 };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterPriority) params['priority'] = this.filterPriority;

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
          this.requests = res.data?.content ?? [];
          this.totalElements = res.data?.totalElements ?? 0;
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
      this.maintSvc.getByOfficer(officerId, params).subscribe({
        next: (res) => {
          this.requests = res.data?.content ?? [];
          this.totalElements = res.data?.totalElements ?? 0;
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
        this.requests = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.page = 0;
    this.load();
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
}
