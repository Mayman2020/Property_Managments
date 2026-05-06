import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf, NgFor, NgClass, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home-portal',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule,
    PageHeaderComponent
  ],
  templateUrl: './home-portal.component.html',
  styleUrl: './home-portal.component.scss'
})
export class HomePortalComponent implements OnInit {
  loading = true;
  isRtl = false;

  /** Mirrors /dashboard/stats for portal cards */
  stats = {
    totalUnits: 0,
    vacantUnits: 0,
    unrentedUnits: 0,
    reservedUnits: 0,
    rentedUnits: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    completedThisMonth: 0,
    lowStockItems: 0,
    openMaintenanceRequests: 0,
    activeContracts: 0,
    cancelledContracts: 0,
    draftContracts: 0,
    pendingOwnerContracts: 0,
    overduePayments: 0,
    expiringIn30Days: 0,
    requestsByStatus: {} as Record<string, number>
  };

  /** Order for maintenance status chips on the home portal */
  readonly maintenanceStatusOrder = [
    'PENDING',
    'ASSIGNED',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'TENANT_ABSENT',
    'NEEDS_REVISIT'
  ] as const;

  constructor(
    private router: Router,
    private dashSvc: DashboardService,
    private i18n: I18nService,
    readonly permissions: PermissionService,
    readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isRtl = this.i18n.isRtl;
    this.dashSvc.getStats().pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.data) {
        const d = res.data;
        this.stats.totalUnits = d.totalUnits ?? 0;
        this.stats.vacantUnits = d.vacantUnits ?? 0;
        this.stats.unrentedUnits = d.unrentedUnits ?? (this.stats.vacantUnits + (d.reservedUnits ?? 0));
        this.stats.reservedUnits = d.reservedUnits ?? 0;
        this.stats.rentedUnits = d.rentedUnits ?? 0;
        this.stats.pendingRequests = d.pendingRequests ?? 0;
        this.stats.inProgressRequests = d.inProgressRequests ?? 0;
        this.stats.completedThisMonth = d.completedThisMonth ?? 0;
        this.stats.lowStockItems = d.lowStockItems ?? 0;
        this.stats.openMaintenanceRequests = d.openMaintenanceRequests ?? 0;
        this.stats.activeContracts = d.activeContracts ?? 0;
        this.stats.cancelledContracts = d.cancelledContracts ?? 0;
        this.stats.draftContracts = d.draftContracts ?? 0;
        this.stats.pendingOwnerContracts = d.pendingOwnerContracts ?? 0;
        this.stats.overduePayments = d.overduePayments ?? 0;
        this.stats.expiringIn30Days = d.expiringIn30Days ?? 0;
        this.stats.requestsByStatus = { ...(d.requestsByStatus ?? {}) };
      }
      this.loading = false;
    });
  }

  /** Draft + pending owner approval (pipeline before activation). */
  draftPipelineTotal(): number {
    return (this.stats.draftContracts ?? 0) + (this.stats.pendingOwnerContracts ?? 0);
  }

  maintenanceCount(code: string): number {
    const v = this.stats.requestsByStatus?.[code];
    return typeof v === 'number' ? v : 0;
  }

  goToMaintenance(): void {
    this.router.navigate(['/admin/maintenance']);
  }

  goToContracts(): void {
    this.router.navigate(['/admin/contracts/dashboard']);
  }

  goToComprehensive(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get showMaintenanceCard(): boolean {
    return this.permissions.can('maintenance', 'view');
  }

  get showContractsCard(): boolean {
    return this.permissions.can('contracts', 'view');
  }

  maintenanceChipClass(code: string): string {
    switch (code) {
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
      case 'TENANT_ABSENT':
        return 'danger';
      case 'PENDING':
      case 'ASSIGNED':
      case 'SCHEDULED':
        return 'warn';
      case 'IN_PROGRESS':
      case 'NEEDS_REVISIT':
        return 'info';
      default:
        return 'neutral';
    }
  }

  maintenanceIcon(code: string): string {
    const icons: Record<string, string> = {
      PENDING: 'hourglass_empty',
      ASSIGNED: 'assignment_ind',
      SCHEDULED: 'event',
      IN_PROGRESS: 'sync',
      COMPLETED: 'task_alt',
      CANCELLED: 'cancel',
      TENANT_ABSENT: 'person_off',
      NEEDS_REVISIT: 'replay'
    };
    return icons[code] ?? 'label';
  }
}

