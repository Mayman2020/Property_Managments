import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { RequestsByStatusPipe } from '../../../shared/pipes/requests-by-status.pipe';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, EmptyStateComponent, RequestsByStatusPipe
  ],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss'
})
export class TenantDashboardComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  loading = true;

  constructor(
    private readonly maintSvc: MaintenanceService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.maintSvc.getRequests({ page: 0, size: 10 }).subscribe({
      next: (res) => { this.requests = res.data?.content ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get currentUser() { return this.auth.getCurrentUser(); }

  statusLabel(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'قيد الانتظار', ASSIGNED: 'مُسنَّد', SCHEDULED: 'مُجدوَل',
      IN_PROGRESS: 'جاري', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',
      TENANT_ABSENT: 'غائب', NEEDS_REVISIT: 'تحتاج مراجعة'
    };
    return m[status] ?? status;
  }

  statusIcon(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'hourglass_empty', ASSIGNED: 'assignment_ind', SCHEDULED: 'event',
      IN_PROGRESS: 'construction', COMPLETED: 'task_alt', CANCELLED: 'cancel',
      TENANT_ABSENT: 'person_off', NEEDS_REVISIT: 'replay'
    };
    return m[status] ?? 'info';
  }
}
