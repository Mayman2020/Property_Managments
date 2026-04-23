import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { MaintenanceService, MaintenanceRequest } from '../../core/services/maintenance.service';
import { InventoryService, InventoryItem } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PermissionService } from '../../core/services/permission.service';

interface StatusTile {
  status: string;
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DecimalPipe,
    DatePipe,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  recentRequests: MaintenanceRequest[] = [];
  lowStockItems: InventoryItem[] = [];
  trendValues: number[] = [];
  loading = true;

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly maintSvc: MaintenanceService,
    private readonly invSvc: InventoryService,
    readonly i18n: I18nService,
    readonly permissions: PermissionService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      stats: this.dashSvc.getStats().pipe(catchError(() => of({ data: null }))),
      requests: this.maintSvc.getRequests({ page: 0, size: 6 }).pipe(catchError(() => of({ data: { content: [] } }))),
      stock: this.invSvc.getLowStock().pipe(catchError(() => of({ data: [] }))),
      trend: this.dashSvc.getMonthlyTrend().pipe(catchError(() => of({ data: [] })))
    }).subscribe(({ stats, requests, stock, trend }) => {
      this.stats = stats.data ?? null;
      this.recentRequests = requests.data?.content ?? [];
      this.lowStockItems = (stock.data ?? []).slice(0, 5);
      this.trendValues = (trend.data ?? []).map((item) => item.value);

      if (this.trendValues.length < 6) {
        this.trendValues = this.fallbackTrend();
      }

      this.loading = false;
    });
  }

  get pageEyebrow(): string {
    return this.i18n.currentLang === 'ar' ? 'مركز القيادة' : 'Command Center';
  }

  get operationsPulseLabel(): string {
    return this.i18n.currentLang === 'ar' ? 'نبض العمليات' : 'Operations pulse';
  }

  get lastThirtyLabel(): string {
    return this.i18n.currentLang === 'ar' ? 'آخر 30 يوم' : 'Last 30 days';
  }

  get occupancyCardLabel(): string {
    return this.i18n.currentLang === 'ar' ? 'الإشغال' : 'Occupancy';
  }

  get vacantLabel(): string {
    return this.i18n.currentLang === 'ar' ? 'الشواغر' : 'Vacant';
  }

  get requestsStatusLabel(): string {
    return this.i18n.currentLang === 'ar' ? 'الطلبات حسب الحالة' : 'Requests by status';
  }

  get lowStockLabel(): string {
    return this.i18n.currentLang === 'ar' ? 'تنبيهات المخزون' : 'Low stock alerts';
  }

  get occupancyPercent(): number {
    if (!this.stats?.totalUnits) return 0;
    return Math.round((this.stats.rentedUnits / this.stats.totalUnits) * 100);
  }

  get donutCircumference(): number {
    return 2 * Math.PI * 78;
  }

  get donutOffset(): number {
    return this.donutCircumference * (1 - this.occupancyPercent / 100);
  }

  get trendPath(): string {
    return this.toLinePath(this.trendValues, 720, 180);
  }

  get trendAreaPath(): string {
    const line = this.toLinePath(this.trendValues, 720, 180);
    return `${line} L 716 180 L 4 180 Z`;
  }

  get statusTiles(): StatusTile[] {
    const byStatus = this.stats?.requestsByStatus ?? {};
    return [
      { status: 'PENDING', label: this.statusLabel('PENDING'), value: byStatus['PENDING'] ?? this.stats?.pendingRequests ?? 0 },
      { status: 'IN_PROGRESS', label: this.statusLabel('IN_PROGRESS'), value: byStatus['IN_PROGRESS'] ?? this.stats?.inProgressRequests ?? 0 },
      { status: 'COMPLETED', label: this.statusLabel('COMPLETED'), value: byStatus['COMPLETED'] ?? this.stats?.completedThisMonth ?? 0 },
      { status: 'NEEDS_REVISIT', label: this.statusLabel('NEEDS_REVISIT'), value: byStatus['NEEDS_REVISIT'] ?? this.stats?.lowStockItems ?? 0 }
    ];
  }

  stockLevel(item: InventoryItem): number {
    if (item.minQuantity <= 0) return 100;
    return Math.min(100, Math.round((item.quantity / item.minQuantity) * 100));
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`);
  }

  priorityLabel(priority: string): string {
    return this.i18n.instant(`PRIORITY.${priority}`);
  }

  private fallbackTrend(): number[] {
    const base = this.stats?.completedThisMonth ?? 70;
    return [base - 36, base - 28, base - 20, base - 12, base - 8, base - 2, base + 4, base + 10];
  }

  private toLinePath(values: number[], width: number, height: number): string {
    if (!values.length) return '';

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * (width - 8) + 4;
        const y = height - 12 - ((value - min) / range) * (height - 28);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }
}
