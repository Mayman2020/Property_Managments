import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { MaintenanceService, MaintenanceRequest, RequestStatus } from '../../../core/services/maintenance.service';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTooltipModule,
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

  readonly statuses: { value: string; label: string }[] = [
    { value: '', label: 'جميع الحالات' },
    { value: 'PENDING', label: 'معلَّق' },
    { value: 'ASSIGNED', label: 'مُسنَّد' },
    { value: 'SCHEDULED', label: 'مُجدوَل' },
    { value: 'IN_PROGRESS', label: 'جاري' },
    { value: 'COMPLETED', label: 'مكتمل' },
    { value: 'CANCELLED', label: 'ملغي' },
    { value: 'TENANT_ABSENT', label: 'مستأجر غائب' },
    { value: 'NEEDS_REVISIT', label: 'تحتاج مراجعة' }
  ];

  readonly priorities = [
    { value: '', label: 'جميع الأولويات' },
    { value: 'LOW', label: 'منخفضة' },
    { value: 'NORMAL', label: 'عادية' },
    { value: 'HIGH', label: 'عالية' },
    { value: 'URGENT', label: 'عاجلة' }
  ];

  constructor(private readonly maintSvc: MaintenanceService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number | boolean> = { page: this.page, size: 20 };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterPriority) params['priority'] = this.filterPriority;

    this.maintSvc.getRequests(params).subscribe({
      next: (res) => {
        this.requests = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter(): void { this.page = 0; this.load(); }

  statusLabel(status: string): string {
    return this.statuses.find((s) => s.value === status)?.label ?? status;
  }

  priorityLabel(p: string): string {
    const m: Record<string, string> = { LOW: 'منخفضة', NORMAL: 'عادية', HIGH: 'عالية', URGENT: 'عاجلة' };
    return m[p] ?? p;
  }
}
