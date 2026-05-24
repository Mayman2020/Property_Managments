import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { NgFor, NgIf, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';

import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { SearchDropdownComponent, SearchDropdownItem } from '../../../shared/components/search-dropdown/search-dropdown.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { MaintenanceInvoiceService, CompanyProperty } from '../../../core/services/maintenance-invoice.service';
import { RequestTimelineDialogComponent } from '../request-timeline-dialog/request-timeline-dialog.component';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { LeaseContract } from '../../../core/models/contract.model';

import { MaintenanceRequestDialogComponent } from '../maintenance-request-dialog/maintenance-request-dialog.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

export type RequestListContext = 'admin' | 'tenant' | 'officer';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT']);

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, RouterLink, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatTabsModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, SearchDropdownComponent,
    HasPermissionDirective
  ],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss'
})
export class RequestListComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  loading = true;
  filterStatus = '';
  filterPriority = '';
  filterPropertyId: number | null = null;
  searchTerm = '';
  totalElements = 0;
  listContext: RequestListContext = 'admin';
  missingTenantLink = false;
  readonly pageSize = 5;
  adminPageIndex = 0;
  tenantCurrentPageIndex = 0;
  tenantPreviousPageIndex = 0;
  properties: Array<Property | CompanyProperty> = [];
  tenantContracts: LeaseContract[] = [];
  selectedTenantPropertyId: number | null = null;
  selectedTenantUnitId: number | null = null;

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
    readonly i18n: I18nService,
    private readonly route: ActivatedRoute,
    readonly auth: AuthService,
    private readonly propertySvc: PropertyService,
    private readonly invoiceSvc: MaintenanceInvoiceService,
    private readonly portalSvc: TenantPortalService,
    private readonly location: Location,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly permissions: PermissionService
  ) {}

  canCreateMaintenanceRequest(): boolean {
    return this.permissions.can('maintenance', 'create');
  }

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    const d = this.route.snapshot.data['listContext'];
    if (d === 'tenant' || d === 'officer' || d === 'admin') {
      this.listContext = d;
    }
    if (this.listContext === 'admin') {
      this.propertySvc.getAll(0, 500).subscribe({
        next: (res) => { this.properties = res.data?.content ?? []; }
      });
    } else if (this.listContext === 'officer') {
      if (this.auth.hasRole('MAINTENANCE_OFFICER_INTERNAL')) {
        // Internal officers are not tied to contractor-company properties.
        this.load();
      } else {
        this.invoiceSvc.getMyProperties().subscribe({
          next: (res) => {
            this.properties = res.data ?? [];
            if (this.properties.length === 1) {
              this.filterPropertyId = this.properties[0].id;
            }
            if (this.filterPropertyId) this.load();
          },
          error: () => this.load()
        });
      }
    }
    this.load();
  }

  get currentRequests(): MaintenanceRequest[] {
    return this.filteredRequests.filter((r) => ACTIVE_STATUSES.has(r.status));
  }

  get previousRequests(): MaintenanceRequest[] {
    return this.filteredRequests.filter((r) => !ACTIVE_STATUSES.has(r.status));
  }

  get activeTenantRequest(): MaintenanceRequest | null {
    return this.currentRequests[0] ?? null;
  }

  get filteredAdminRequests(): MaintenanceRequest[] {
    return this.filteredRequests;
  }

  get pagedAdminRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filteredAdminRequests, this.adminPageIndex);
  }

  get pagedCurrentRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filterBySearch(this.currentRequests), this.tenantCurrentPageIndex);
  }

  get pagedPreviousRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filterBySearch(this.previousRequests), this.tenantPreviousPageIndex);
  }

  get pagedTenantRequests(): MaintenanceRequest[] {
    return this.pageSlice(this.filteredRequests, this.tenantCurrentPageIndex);
  }

  load(): void {
    this.loading = true;
    this.missingTenantLink = false;
    const params: Record<string, string | number | boolean> = { page: 0, size: 500 };

    if (this.listContext === 'tenant') {
      const tenantId = this.auth.getCurrentUser()?.tenantId;
      if (tenantId == null) {
        this.requests = [];
        this.totalElements = 0;
        this.missingTenantLink = true;
        this.loading = false;
        return;
      }
      forkJoin({
        requests: this.maintSvc.getByTenant(tenantId, params),
        contracts: this.portalSvc.getMyContracts()
      }).subscribe({
        next: ({ requests, contracts }) => {
          this.requests = this.sortRequests(requests.data?.content ?? []);
          this.tenantContracts = contracts.data ?? [];
          const queryPropertyId = Number(this.route.snapshot.queryParamMap.get('propertyId'));
          const queryUnitId = Number(this.route.snapshot.queryParamMap.get('unitId'));
          this.selectedTenantPropertyId = queryPropertyId || null;
          this.selectedTenantUnitId = queryUnitId || null;
          if (this.selectedTenantUnitId && !this.tenantUnitRows.some((c) => c.unitId === this.selectedTenantUnitId)) {
            this.selectedTenantUnitId = null;
          }
          this.totalElements = this.filteredRequests.length;
          this.resetPagerIndexes();
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
      return;
    }

    if (this.listContext === 'officer') {
      const officerId = this.auth.getCurrentUser()?.id;
      if (officerId == null) { this.loading = false; return; }
      const mergedParams: Record<string, string | number | boolean> = { ...params, page: 0, size: 500 };
      if (this.filterPropertyId != null) mergedParams['propertyId'] = this.filterPropertyId;
      forkJoin({
        mine: this.maintSvc.getByOfficer(officerId, mergedParams),
        queue: this.maintSvc.getCompanyQueue(mergedParams)
      }).subscribe({
        next: ({ mine, queue }) => {
          const a = mine.data?.content ?? [];
          const b = queue.data?.content ?? [];
          const map = new Map<number, MaintenanceRequest>();
          for (const r of b) map.set(r.id, r);
          for (const r of a) map.set(r.id, r);
          this.requests = Array.from(map.values()).sort(
            (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
          );
          this.totalElements = this.filteredRequests.length;
          this.resetPagerIndexes();
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
      return;
    }

    this.maintSvc.getRequests(params).subscribe({
      next: (res) => {
        this.requests = this.sortRequests(res.data?.content ?? []);
        this.totalElements = this.filteredRequests.length;
        this.resetPagerIndexes();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  hasFiltersBar(): boolean {
    return !!(this.filterPropertyId || this.filterStatus || this.filterPriority || this.searchTerm);
  }

  clearFiltersFromBar(): void {
    this.filterPropertyId = null;
    this.filterStatus = '';
    this.filterPriority = '';
    this.searchTerm = '';
    if (this.listContext === 'officer') {
      this.load();
      return;
    }
    this.applyFilter();
  }

  applyFilter(): void {
    this.totalElements = this.filteredRequests.length;
    this.resetPagerIndexes();
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.totalElements = this.filteredRequests.length;
    this.resetPagerIndexes();
  }

  totalPages(length: number): number {
    return Math.max(1, Math.ceil(length / this.pageSize));
  }

  changeAdminPage(step: number): void {
    this.adminPageIndex = this.clampPage(this.adminPageIndex + step, this.filteredAdminRequests.length);
  }

  changeTenantCurrentPage(step: number): void {
    this.tenantCurrentPageIndex = this.clampPage(this.tenantCurrentPageIndex + step, this.filterBySearch(this.currentRequests).length);
  }

  changeTenantPreviousPage(step: number): void {
    this.tenantPreviousPageIndex = this.clampPage(this.tenantPreviousPageIndex + step, this.filterBySearch(this.previousRequests).length);
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`);
  }

  priorityLabel(priority: string): string {
    return this.i18n.instant(`PRIORITY.${priority}`);
  }

  contractStatusLabel(status: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${status}`);
  }

  responsibleLabel(req: MaintenanceRequest): string {
    const officer = this.cleanText(req.assignedOfficerName);
    const company = this.localizedName(
      req.assignedOfficerCompanyNameAr,
      req.assignedOfficerCompanyNameEn,
      req.assignedOfficerCompanyName
    ) || this.localizedName(
      req.contractorCompanyNameAr,
      req.contractorCompanyNameEn,
      req.contractorCompanyName
    );
    if (officer && company) return `${officer} - ${company}`;
    return officer || company || '—';
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

  openTimeline(req: MaintenanceRequest): void {
    this.dialog.open(RequestTimelineDialogComponent, { data: req, width: '560px', panelClass: 'app-dialog-panel', disableClose: true });
  }

  openNewRequest(): void {
    if (this.listContext === 'tenant') {
      const contract = this.selectedTenantContract;
      void this.router.navigate(['/tenant/new-request'], {
        queryParams: {
          unitId: this.selectedTenantUnitId ?? undefined,
          propertyId: contract?.propertyId ?? undefined
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(MaintenanceRequestDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'app-dialog-panel',
      data: { context: this.listContext },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  private pageSlice(list: MaintenanceRequest[], pageIndex: number): MaintenanceRequest[] {
    const start = pageIndex * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  private clampPage(nextIndex: number, listLength: number): number {
    const max = this.totalPages(listLength) - 1;
    return Math.max(0, Math.min(nextIndex, max));
  }

  get filteredRequests(): MaintenanceRequest[] {
    return this.applyClientFilters(this.requests);
  }

  get tenantUnitRows(): LeaseContract[] {
    const seen = new Map<number, LeaseContract>();
    for (const contract of this.selectableTenantContracts) {
      if (this.selectedTenantPropertyId && contract.propertyId !== this.selectedTenantPropertyId) continue;
      if (contract.unitId && !seen.has(contract.unitId)) {
        seen.set(contract.unitId, contract);
      }
    }
    return Array.from(seen.values());
  }

  get tenantUnitDropdownItems(): SearchDropdownItem[] {
    return this.tenantUnitRows.map((contract) => ({
      label: `${contract.unitNumber || '-'} - ${contract.propertyName || '-'}`,
      subLabel: contract.contractNumber,
      badge: this.contractStatusLabel(contract.status),
      badgeClass: 'st-' + contract.status,
      data: contract
    }));
  }

  get selectedTenantUnitLabel(): string {
    const c = this.selectedTenantContract;
    if (!c) return this.i18n.instant('INLINE_TEXT.CHOOSE_A_UNIT_2');
    return `${c.unitNumber || '-'} - ${c.propertyName || '-'}`;
  }

  get tenantPropertyRows(): LeaseContract[] {
    const seen = new Map<number, LeaseContract>();
    for (const contract of this.selectableTenantContracts) {
      if (contract.propertyId && !seen.has(contract.propertyId)) {
        seen.set(contract.propertyId, contract);
      }
    }
    return Array.from(seen.values());
  }

  get selectedTenantContract(): LeaseContract | null {
    if (!this.selectedTenantUnitId) return null;
    return this.tenantUnitRows.find((c) => c.unitId === this.selectedTenantUnitId) ?? null;
  }

  get selectableTenantContracts(): LeaseContract[] {
    return this.tenantContracts.filter((contract) => contract.status === 'ACTIVE');
  }

  selectTenantProperty(propertyId: number | null): void {
    this.selectedTenantPropertyId = propertyId;
    if (this.selectedTenantUnitId && !this.tenantUnitRows.some((c) => c.unitId === this.selectedTenantUnitId)) {
      this.selectedTenantUnitId = null;
    }
    this.applyFilter();
  }

  selectTenantUnit(unitId: number | null): void {
    this.selectedTenantUnitId = unitId;
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterPriority = '';
    this.applyFilter();
  }

  onTenantUnitDropdownSelect(contract: LeaseContract | null): void {
    if (!contract?.unitId) return;
    this.selectTenantUnit(contract.unitId);
  }

  propertyRequestsCount(propertyId: number): number {
    return this.requests.filter((req) => req.propertyId === propertyId).length;
  }

  tenantUnitScopeRequestsCount(): number {
    return this.requests.filter((req) => {
      if (this.selectedTenantPropertyId && req.propertyId !== this.selectedTenantPropertyId) return false;
      return true;
    }).length;
  }

  unitRequestsCount(unitId: number): number {
    return this.requests.filter((req) => req.unitId === unitId).length;
  }

  tenantStatusCount(status: string): number {
    return this.requests.filter((req) => {
      if (!this.selectedTenantUnitId || req.unitId !== this.selectedTenantUnitId) return false;
      return status ? req.status === status : true;
    }).length;
  }

  statusFilterIcon(status: string): string {
    const icons: Record<string, string> = {
      PENDING: 'hourglass_empty',
      ASSIGNED: 'assignment_ind',
      SCHEDULED: 'event',
      IN_PROGRESS: 'construction',
      NEEDS_REVISIT: 'replay',
      COMPLETED: 'task_alt',
      CANCELLED: 'cancel',
      TENANT_ABSENT: 'person_off'
    };
    return status ? icons[status] ?? 'info' : 'apps';
  }

  filterBySearch(list: MaintenanceRequest[]): MaintenanceRequest[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((req) =>
      [
        req.requestNumber,
        req.title,
        req.description,
        req.propertyName,
        req.unitNumber,
        req.tenantName,
        req.assignedOfficerName,
        req.assignedOfficerCompanyName,
        req.assignedOfficerCompanyNameAr,
        req.assignedOfficerCompanyNameEn,
        req.contractorCompanyName,
        req.contractorCompanyNameAr,
        req.contractorCompanyNameEn
      ].join(' ').toLowerCase().includes(q)
    );
  }

  private applyClientFilters(list: MaintenanceRequest[]): MaintenanceRequest[] {
    return this.filterBySearch(list).filter((req) => {
      if (this.filterStatus && req.status !== this.filterStatus) return false;
      if (this.filterPriority && req.priority !== this.filterPriority) return false;
      if (this.filterPropertyId && req.propertyId !== this.filterPropertyId) return false;
      if (this.listContext === 'tenant' && this.selectedTenantPropertyId && req.propertyId !== this.selectedTenantPropertyId) return false;
      if (this.listContext === 'tenant' && this.selectedTenantUnitId && req.unitId !== this.selectedTenantUnitId) return false;
      return true;
    });
  }

  private sortRequests(list: MaintenanceRequest[]): MaintenanceRequest[] {
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private resetPagerIndexes(): void {
    this.adminPageIndex = 0;
    this.tenantCurrentPageIndex = 0;
    this.tenantPreviousPageIndex = 0;
  }

  isSlaAtRisk(req: MaintenanceRequest): boolean {
    if (req.slaBreached) return true;
    if (!req.slaDeadline) return false;
    const terminal = ['COMPLETED', 'CANCELLED'];
    if (terminal.includes(req.status)) return false;
    return new Date(req.slaDeadline).getTime() < Date.now();
  }

  slaDeadlineLabel(req: MaintenanceRequest): string {
    if (!req.slaDeadline) return '—';
    const d = new Date(req.slaDeadline);
    return Number.isNaN(d.getTime()) ? req.slaDeadline : d.toLocaleString();
  }

  private localizedName(ar?: string | null, en?: string | null, fallback?: string | null): string {
    const arText = this.cleanText(ar);
    const enText = this.cleanText(en);
    const fallbackText = this.cleanText(fallback);
    return this.i18n.currentLang === 'ar'
      ? (arText || enText || fallbackText)
      : (enText || arText || fallbackText);
  }

  private cleanText(value?: string | null): string {
    const text = value?.trim() ?? '';
    return text && !/^[?\s\uFFFD]+$/.test(text) ? text : '';
  }
}
