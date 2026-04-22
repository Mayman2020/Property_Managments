import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';

import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT']);

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, RouterLink, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule,
    EmptyStateComponent
  ],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss'
})
export class TenantDashboardComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  loading = true;
  missingTenantLink = false;

  constructor(
    private readonly maintSvc: MaintenanceService,
    private readonly i18n: I18nService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const tenantId = this.auth.getCurrentUser()?.tenantId;
    if (tenantId == null) {
      this.requests = [];
      this.missingTenantLink = true;
      this.loading = false;
      return;
    }
    this.maintSvc.getByTenant(tenantId, { page: 0, size: 100 }).subscribe({
      next: (res) => { this.requests = res.data?.content ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get currentRequests(): MaintenanceRequest[] {
    return this.requests.filter(r => ACTIVE_STATUSES.has(r.status));
  }

  get previousRequests(): MaintenanceRequest[] {
    return this.requests.filter(r => !ACTIVE_STATUSES.has(r.status));
  }

  get currentUser() { return this.auth.getCurrentUser(); }
  get scheduledCount(): number { return this.requests.filter(r => r.status === 'SCHEDULED').length; }
  get inProgressCount(): number { return this.requests.filter(r => r.status === 'IN_PROGRESS').length; }

  statusLabel(status: string): string { return this.i18n.instant(`STATUS.${status}`); }
  priorityLabel(priority: string): string { return this.i18n.instant(`PRIORITY.${priority}`); }

  statusIcon(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'hourglass_empty', ASSIGNED: 'assignment_ind', SCHEDULED: 'event',
      IN_PROGRESS: 'construction', NEEDS_REVISIT: 'replay',
      COMPLETED: 'task_alt', CANCELLED: 'cancel', TENANT_ABSENT: 'person_off'
    };
    return m[status] ?? 'info';
  }
}
