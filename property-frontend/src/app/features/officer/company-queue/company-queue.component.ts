import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { MaintenanceRequest, MaintenanceService } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-company-queue',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './company-queue.component.html',
  styleUrl: './company-queue.component.scss'
})
export class CompanyQueueComponent implements OnInit {
  loading = true;
  error = false;
  requests: MaintenanceRequest[] = [];
  claimingId: number | null = null;

  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.maintenanceService.getCompanyQueue({ page: 0, size: 50 }).subscribe({
      next: (res) => {
        this.requests = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  claim(req: MaintenanceRequest): void {
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser?.id || this.claimingId != null) return;
    this.claimingId = req.id;
    this.maintenanceService.assign(req.id, currentUser.id).subscribe({
      next: () => {
        this.claimingId = null;
        this.load();
      },
      error: () => {
        this.claimingId = null;
      }
    });
  }

  priorityClass(req: MaintenanceRequest): string {
    return req.priority?.toLowerCase() ?? 'normal';
  }
}
