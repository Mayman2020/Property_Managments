import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgIf, DecimalPipe } from '@angular/common';
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
    NgIf, DecimalPipe,
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

  stats = {
    pendingRequests: 0,
    lowStockItems: 0,
    activeContracts: 0,
    overduePayments: 0,
    expiringIn30Days: 0,
    openViolations: 0
  };

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
        this.stats.pendingRequests = d.pendingRequests ?? 0;
        this.stats.lowStockItems = d.lowStockItems ?? 0;
        this.stats.activeContracts = d.activeContracts ?? 0;
        this.stats.overduePayments = d.overduePayments ?? 0;
        this.stats.expiringIn30Days = d.expiringIn30Days ?? 0;
        this.stats.openViolations = d.openViolations ?? 0;
      }
      this.loading = false;
    });
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
}
