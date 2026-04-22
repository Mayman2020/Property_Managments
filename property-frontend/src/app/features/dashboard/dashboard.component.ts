import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { MaintenanceService, MaintenanceRequest } from '../../core/services/maintenance.service';
import { InventoryService, InventoryItem } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, DecimalPipe, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, StatCardComponent, EmptyStateComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  recentRequests: MaintenanceRequest[] = [];
  lowStockItems: InventoryItem[] = [];
  loading = true;

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly maintSvc: MaintenanceService,
    private readonly invSvc: InventoryService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    this.dashSvc.getStats().subscribe({
      next: (res) => { this.stats = res.data; },
      error: () => { this.stats = this.mockStats(); }
    });

    this.maintSvc.getRequests({ page: 0, size: 6 }).subscribe({
      next: (res) => { this.recentRequests = res.data?.content ?? []; },
      error: () => { this.recentRequests = []; }
    });

    this.invSvc.getLowStock().subscribe({
      next: (res) => { this.lowStockItems = res.data ?? []; this.loading = false; },
      error: () => { this.lowStockItems = []; this.loading = false; }
    });
  }

  get rentedPercent(): number {
    if (!this.stats) return 0;
    return this.stats.totalUnits ? Math.round((this.stats.rentedUnits / this.stats.totalUnits) * 100) : 0;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'قيد الانتظار', ASSIGNED: 'مُسنَّد', SCHEDULED: 'مُجدوَل',
      IN_PROGRESS: 'جاري', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',
      TENANT_ABSENT: 'غائب', NEEDS_REVISIT: 'تحتاج مراجعة'
    };
    return map[status] ?? status;
  }

  private mockStats(): DashboardStats {
    return { totalProperties: 12, totalUnits: 148, rentedUnits: 121, vacantUnits: 27, pendingRequests: 8, inProgressRequests: 3, completedThisMonth: 24, lowStockItems: 2 };
  }
}
