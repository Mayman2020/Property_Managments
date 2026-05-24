import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { DashboardService, DashboardStats, RecentActivityItem } from '../../../core/services/dashboard.service';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { InventoryService, InventoryItem } from '../../../core/services/inventory.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';
import { FinanceDashboardDto, FinanceService } from '../../../core/services/finance.service';

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
    FormsModule,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    TablePagerComponent
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
  properties: Property[] = [];
  selectedPropertyId: number | null = null;
  financeStats: FinanceDashboardDto | null = null;
  recentActivity: RecentActivityItem[] = [];
  readonly activityPageSize = 5;
  activityPageIndex = 0;
  trendLabels: string[] = [];

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly financeSvc: FinanceService,
    private readonly maintSvc: MaintenanceService,
    private readonly invSvc: InventoryService,
    private readonly propertySvc: PropertyService,
    private readonly router: Router,
    readonly i18n: I18nService,
    readonly permissions: PermissionService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
      },
      error: () => {}
    });
    this.loadData();
  }

  onPropertyChange(): void {
    this.loadData();
  }

  getPropertyLabel(property: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyName)
      : (property.propertyNameEn || property.propertyName);
    return name || this.i18n.instant('COMMON.UNKNOWN');
  }

  loadData(): void {
    this.loading = true;
    const maintenanceEnabled = this.permissions.can('maintenance', 'view');
    const inventoryEnabled = this.permissions.can('inventory', 'view');
    const pid = this.selectedPropertyId;

    const statsObs$ = pid
      ? this.dashSvc.getStatsByProperty(pid).pipe(catchError(() => of({ data: null })))
      : this.dashSvc.getStats().pipe(catchError(() => of({ data: null })));

    const requestsParams: Record<string, string | number | boolean> = { page: 0, size: 6 };
    if (pid) requestsParams['propertyId'] = pid;

    const stockObs$ = inventoryEnabled
      ? this.invSvc.getItems(pid ?? undefined, 0, 5).pipe(catchError(() => of({ data: { content: [] } })))
      : of({ data: { content: [] } });

    const financeObs$ = this.permissions.can('finance', 'view')
      ? this.financeSvc.getDashboard(pid ?? undefined).pipe(catchError(() => of({ data: null })))
      : of({ data: null });

    const activityObs$ = this.dashSvc.getRecentActivity(12, pid ?? undefined).pipe(catchError(() => of({ data: [] })));

    forkJoin({
      stats: statsObs$,
      requests: maintenanceEnabled
        ? this.maintSvc.getRequests(requestsParams).pipe(catchError(() => of({ data: { content: [] } })))
        : of({ data: { content: [] } }),
      stock: stockObs$,
      trend: maintenanceEnabled
        ? this.dashSvc.getMonthlyTrend(pid ?? undefined).pipe(catchError(() => of({ data: [] })))
        : of({ data: [] }),
      finance: financeObs$,
      activity: activityObs$
    }).subscribe(({ stats, requests, stock, trend, finance, activity }) => {
      this.stats = stats.data ?? null;
      this.financeStats = finance.data ?? null;
      this.recentActivity = activity.data ?? [];
      this.activityPageIndex = 0;
      this.recentRequests = requests.data?.content ?? [];
      this.lowStockItems = ((stock.data as { content?: InventoryItem[] })?.content ?? []).slice(0, 5);
      const trendPoints = trend.data ?? [];
      this.trendValues = trendPoints.map((item) => item.value);
      this.trendLabels = trendPoints.map((item) => item.label);

      if (this.trendValues.length < 2) {
        this.trendValues = this.fallbackTrend();
        this.trendLabels = [];
      }

      this.loading = false;
    });
  }

  get pageEyebrow(): string {
    return this.i18n.instant('DASHBOARD.COMMAND_CENTER');
  }

  get operationsPulseLabel(): string {
    return this.i18n.instant('DASHBOARD.OPERATIONS_PULSE');
  }

  get lastThirtyLabel(): string {
    return this.i18n.instant('DASHBOARD.LAST_30_DAYS');
  }

  get occupancyCardLabel(): string {
    return this.i18n.instant('DASHBOARD.OCCUPANCY');
  }

  get vacantLabel(): string {
    return this.i18n.instant('DASHBOARD.VACANT');
  }

  get requestsStatusLabel(): string {
    return this.i18n.instant('DASHBOARD.REQUESTS_BY_STATUS');
  }

  get lowStockLabel(): string {
    return this.i18n.instant('DASHBOARD.LOW_STOCK_ALERTS');
  }

  get occupancyPercent(): number {
    if (!this.stats?.totalUnits) return 0;
    const occupied = this.stats.rentedUnits + (this.stats.reservedUnits ?? 0);
    return Math.round((occupied / this.stats.totalUnits) * 100);
  }

  get showMaintenanceInsights(): boolean {
    return this.permissions.can('maintenance', 'view');
  }

  get showInventoryInsights(): boolean {
    return this.permissions.can('inventory', 'view');
  }

  get showFinanceInsights(): boolean {
    return this.permissions.can('finance', 'view') && this.financeStats != null;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.i18n.currentLang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0
    }).format(amount ?? 0);
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

  inventoryItemName(item: InventoryItem): string {
    return this.i18n.currentLang === 'ar' ? item.itemNameAr : (item.itemNameEn || item.itemNameAr);
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`);
  }

  priorityLabel(priority: string): string {
    return this.i18n.instant(`PRIORITY.${priority}`);
  }

  activityLabel(item: RecentActivityItem): string {
    const key = `DASHBOARD.ACTIVITY_${item.category}`;
    const translated = this.i18n.instant(key);
    return translated !== key ? translated : item.category;
  }

  get pagedRecentActivity(): RecentActivityItem[] {
    const start = this.activityPageIndex * this.activityPageSize;
    return this.recentActivity.slice(start, start + this.activityPageSize);
  }

  openMaintenanceContractDialog(): void {
    // Navigate to contracts page for creating maintenance contract
    void this.router.navigate(['/admin/contracts/list'], {
      queryParams: { type: 'MAINTENANCE', openDialog: '1' }
    });
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
