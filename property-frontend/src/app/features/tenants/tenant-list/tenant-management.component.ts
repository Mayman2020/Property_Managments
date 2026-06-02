import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
﻿import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, NgFor, NgIf, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { Property, PropertyService } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { Tenant, TenantService } from '../../../core/services/tenant.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { TableEntityCellComponent } from '../../../shared/components/table-entity-cell/table-entity-cell.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { TenantDialogComponent } from '../tenant-dialog/tenant-dialog.component';
import { TenantEditDialogComponent } from '../tenant-edit-dialog/tenant-edit-dialog.component';
import { ContractDialogComponent } from '../../contracts/contract-dialog/contract-dialog.component';
import { ContractService } from '../../../core/services/contract.service';
import { LeaseContract } from '../../../core/models/contract.model';
import { PermissionService } from '../../../core/services/permission.service';
import { ListLoadController } from '../../../shared/utils/list-load.util';

/** One logical person — may have multiple tenant records (entries) and multiple active contracts. */
export interface TenantGroup {
  key: string;
  representative: Tenant;
  entries: Tenant[];
  contracts: LeaseContract[]; // all active contracts for all entries in this group
}

// ─── Unit / Contract Picker Dialog ───────────────────────────────────────────

@Component({
  selector: 'app-unit-picker-dialog',
  standalone: true,
  imports: [NgFor, MatButtonModule, MatIconModule, MatDialogModule, TranslateModule, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title>{{ 'TENANTS.PICK_UNIT' | translate }}</h2>
    <mat-dialog-content>
      <p class="pick-subtitle">{{ 'TENANTS.PICK_UNIT_SUBTITLE' | translate }}</p>
      <div class="unit-pick-list">
        <button *ngFor="let c of data.contracts" class="unit-pick-btn" type="button" (click)="pick(c)">
          <mat-icon>home</mat-icon>
          <span class="pick-label">
            <strong>{{ c.unitNumber || ('#' + c.unitId) }}</strong>
            <small>{{ c.propertyName || '' }}</small>
          </span>
          <mat-icon class="pick-arrow">chevron_right</mat-icon>
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'ACTIONS.CANCEL' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .pick-subtitle { font-size: 13px; color: #666; margin: 0 0 12px; }
    .unit-pick-list { display: flex; flex-direction: column; gap: 8px; min-width: 280px; padding: 4px 0 8px; }
    .unit-pick-btn {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;
      cursor: pointer; text-align: start; transition: background .15s, border-color .15s; width: 100%;
    }
    .unit-pick-btn:hover { background: #f5f7ff; border-color: #c5cae9; }
    .pick-label { display: flex; flex-direction: column; flex: 1; gap: 2px; }
    .pick-label strong { font-size: 14px; font-weight: 600; }
    .pick-label small { font-size: 12px; color: #888; }
    .pick-arrow { color: #aaa; }
  `]
})
export class UnitPickerDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { contracts: LeaseContract[] },
    private ref: MatDialogRef<UnitPickerDialogComponent>
  ) {}
  pick(c: LeaseContract): void { this.ref.close(c); }
}

// ─── Tenant Units View Dialog (read-only) ────────────────────────────────────

@Component({
  selector: 'app-tenant-units-view-dialog',
  standalone: true,
  imports: [NgFor, NgIf, MatButtonModule, MatIconModule, MatDialogModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ 'TENANTS.VIEW_ALL_UNITS' | translate }}</h2>
    <mat-dialog-content>
      <p class="pick-subtitle">{{ data.tenantName }}</p>
      <div class="unit-pick-list">
        <ng-container *ngIf="data.contracts.length > 0; else entryList">
          <div *ngFor="let c of data.contracts" class="unit-pick-btn unit-pick-btn--static">
            <mat-icon>home</mat-icon>
            <span class="pick-label">
              <strong>{{ c.unitNumber || ('#' + c.unitId) }}</strong>
              <small>{{ c.propertyName || data.propertyLabel(c.propertyId) }}</small>
            </span>
          </div>
        </ng-container>
        <ng-template #entryList>
          <div *ngFor="let e of data.entries" class="unit-pick-btn unit-pick-btn--static">
            <mat-icon>home</mat-icon>
            <span class="pick-label">
              <strong>{{ data.unitLabel(e.unitId) }}</strong>
              <small>{{ data.propertyLabel(e.propertyId) }}</small>
            </span>
          </div>
        </ng-template>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'ACTIONS.CLOSE' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .pick-subtitle { font-size: 13px; color: #666; margin: 0 0 12px; font-weight: 600; }
    .unit-pick-list { display: flex; flex-direction: column; gap: 8px; min-width: 280px; max-height: 360px; overflow-y: auto; padding: 4px 0 8px; }
    .unit-pick-btn {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; width: 100%;
    }
    .unit-pick-btn--static { cursor: default; }
    .pick-label { display: flex; flex-direction: column; flex: 1; gap: 2px; }
    .pick-label strong { font-size: 14px; font-weight: 600; }
    .pick-label small { font-size: 12px; color: #888; }
  `]
})
export class TenantUnitsViewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      tenantName: string;
      contracts: LeaseContract[];
      entries: Tenant[];
      propertyLabel: (id?: number) => string;
      unitLabel: (id?: number) => string;
    }
  ) {}
}

// ─── Tenant Management Component ─────────────────────────────────────────────

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, TranslateModule,
    MatButtonModule, MatProgressSpinnerModule, MatIconModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, FilterBarComponent, TableExportToolbarComponent, TableEntityCellComponent, TableRowIndexPipe
  ],
  templateUrl: './tenant-management.component.html',
  styleUrl: './tenant-management.component.scss'
})
export class TenantManagementComponent implements OnInit {
  listLoad = new ListLoadController();
  readonly pageSize = 5;
  private static readonly MAX_VISIBLE_UNITS = 3;
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  groupedTenants: TenantGroup[] = [];
  totalElements = 0;
  properties: Property[] = [];
  propertyById: Record<number, Property> = {};
  unitById: Record<number, Unit> = {};
  filterPropertyId: number | null = null;
  filterActive: boolean | null = null;
  filterPortal: boolean | null = null;
  searchTerm = '';
  pageIndex = 0;
  pageFilters: FilterSpec[] = [];
  contractsByTenantId: Record<number, LeaseContract[]> = {};

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  constructor(
    private readonly tenantSvc: TenantService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly contractSvc: ContractService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    readonly i18n: I18nService,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly permissions: PermissionService
  ) {}

  canCreateTenant(): boolean {
    return this.permissions.can('tenants', 'create');
  }

  canEditTenant(): boolean {
    return this.permissions.can('tenants', 'edit');
  }

  canDeleteTenant(): boolean {
    return this.permissions.can('tenants', 'delete');
  }

  goBack(): void { this.location.back(); }

  tenantPortalLoginActive(t: Tenant): boolean {
    return !!(t.userId && t.linkedUserActive);
  }

  tenantRowEffectiveActive(t: Tenant): boolean {
    if (!t.active) return false;
    if (t.userId) return !!t.linkedUserActive;
    return true;
  }

  // ── Grouping ────────────────────────────────────────────────────────────────

  private recomputeGroups(): void {
    const map = new Map<string, TenantGroup>();
    for (const t of this.filteredTenants) {
      const key = t.nationalId?.trim() || t.email?.trim() || t.fullName.trim();
      if (!map.has(key)) {
        map.set(key, { key, representative: t, entries: [], contracts: [] });
      }
      map.get(key)!.entries.push(t);
    }
    this.groupedTenants = Array.from(map.values());
    this.updateGroupContracts();
  }

  private updateGroupContracts(): void {
    for (const group of this.groupedTenants) {
      group.contracts = group.entries.flatMap(e => this.contractsByTenantId[e.id] ?? []);
    }
  }

  // ── Paging (server-side) ────────────────────────────────────────────────────

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.loadTenants();
  }

  get exportColumns(): ExportColumn<TenantGroup>[] {
    return [
      { header: this.i18n.instant('PROFILE.FULL_NAME'), value: (row) => this.tenantDisplayName(row.representative) },
      { header: this.i18n.instant('REQUEST_FORM.PROPERTY'), value: (row) => this.groupPropertyLabels(row) },
      { header: this.i18n.instant('UNITS.UNIT_NUMBER'), value: (row) => this.groupUnitLabels(row) },
      { header: this.i18n.instant('AUTH.EMAIL'), value: (row) => row.representative.email || '-' },
      { header: this.i18n.instant('PROFILE.PHONE'), value: (row) => row.representative.phone || '-' },
      { header: this.i18n.instant('TENANTS.PORTAL_LOGIN'), value: (row) => this.i18n.instant(this.tenantPortalLoginActive(row.representative) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') },
      { header: this.i18n.instant('COMMON.ACTIVE'), value: (row) => this.i18n.instant(this.tenantRowEffectiveActive(row.representative) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') }
    ];
  }

  // ── Contract Picker ─────────────────────────────────────────────────────────

  private pickContractThenDo(group: TenantGroup, action: (c: LeaseContract) => void): void {
    if (group.contracts.length === 0) return;
    if (group.contracts.length === 1) { action(group.contracts[0]); return; }
    this.dialog.open(UnitPickerDialogComponent, {
      data: { contracts: group.contracts },
      width: '420px',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe((c: LeaseContract | undefined) => {
      if (c) action(c);
    });
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('propertyId');
    if (qp) {
      const n = Number(qp);
      if (!Number.isNaN(n) && n > 0) this.filterPropertyId = n;
    }
    this.loadData();
  }

  openAddDialog(): void {
    this.dialog.open(TenantDialogComponent, {
      data: { properties: this.properties, defaultPropertyId: this.filterPropertyId ?? undefined },
      width: '640px', maxWidth: '95vw', maxHeight: '90vh',
      panelClass: 'app-dialog-panel', disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.loadTenants(); });
  }

  openTenantDetails(tenant: Tenant): void {
    this.dialog.open(TenantEditDialogComponent, {
      data: { tenantId: tenant.id, properties: this.properties, readOnly: true },
      width: '640px', maxWidth: '95vw', maxHeight: '90vh',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe(() => {});
  }

  openTenantEdit(tenant: Tenant): void {
    this.dialog.open(TenantEditDialogComponent, {
      data: { tenantId: tenant.id, properties: this.properties },
      width: '640px', maxWidth: '95vw', maxHeight: '90vh',
      panelClass: 'app-dialog-panel', disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.loadTenants(); });
  }

  openAssignUnit(tenant: Tenant): void {
    this.dialog.open(ContractDialogComponent, {
      width: '980px', maxWidth: '95vw', maxHeight: '95vh',
      panelClass: 'app-dialog-panel', disableClose: true,
      data: { tenantId: tenant.id, tenantName: tenant.fullName }
    }).afterClosed().subscribe((ok) => { if (ok) this.loadTenants(); });
  }

  openTenantDetailsForGroup(group: TenantGroup): void {
    if (group.contracts.length <= 1) { this.openTenantDetails(group.representative); return; }
    this.pickContractThenDo(group, (c) => {
      const tenant = group.entries.find(e => e.id === c.tenantId) ?? group.representative;
      this.openTenantDetails(tenant);
    });
  }

  openTenantEditForGroup(group: TenantGroup): void {
    if (group.contracts.length <= 1) { this.openTenantEdit(group.representative); return; }
    this.pickContractThenDo(group, (c) => {
      const tenant = group.entries.find(e => e.id === c.tenantId) ?? group.representative;
      this.openTenantEdit(tenant);
    });
  }

  viewContractForGroup(group: TenantGroup): void {
    this.pickContractThenDo(group, (c) => this.router.navigate(['/admin/contracts', c.id]));
  }

  removeFromGroup(group: TenantGroup): void {
    if (group.contracts.length <= 1) {
      this.remove(group.entries[0]);
      return;
    }
    this.pickContractThenDo(group, (c) => {
      const entry = group.entries.find(e => e.id === c.tenantId) ?? group.entries[0];
      this.remove(entry);
    });
  }

  discountLabel(reason?: string): string {
    if (!reason) return '';
    const map: Record<string, string> = {
      OWNER_AGREEMENT: this.i18n.instant('CONTRACTS.DISCOUNT_OWNER_AGREEMENT'),
      OLD_TENANT: this.i18n.instant('CONTRACTS.DISCOUNT_OLD_TENANT'),
      OTHER: this.i18n.instant('CONTRACTS.DISCOUNT_OTHER')
    };
    return map[reason] ?? reason;
  }

  loadActiveContracts(): void {
    const tenantIds = new Set(this.tenants.map((t) => t.id));
    if (!tenantIds.size) {
      this.contractsByTenantId = {};
      this.updateGroupContracts();
      return;
    }
    this.contractSvc.getAll({ status: 'ACTIVE', page: 0, size: 100 }).subscribe({
      next: (res) => {
        const contracts: LeaseContract[] = res.data?.content ?? res.data ?? [];
        this.contractsByTenantId = {};
        for (const c of contracts) {
          if (!c.tenantId || !tenantIds.has(c.tenantId)) continue;
          if (!this.contractsByTenantId[c.tenantId]) this.contractsByTenantId[c.tenantId] = [];
          this.contractsByTenantId[c.tenantId].push(c);
        }
        this.updateGroupContracts();
      }
    });
  }

  private setupFilters(): void {
    const filters: FilterSpec[] = [];
    if (this.properties.length > 0) {
      filters.push({
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      });
    }
    filters.push(
      {
        key: 'filterPortal',
        label: 'TENANTS.PORTAL_LOGIN',
        type: 'select',
        options: [
          { value: true, label: this.i18n.instant('COMMON.ACTIVE') },
          { value: false, label: this.i18n.instant('COMMON.INACTIVE') }
        ]
      },
      {
        key: 'filterActive',
        label: 'COMMON.ACTIVE',
        type: 'select',
        options: [
          { value: true, label: this.i18n.instant('COMMON.ACTIVE') },
          { value: false, label: this.i18n.instant('COMMON.INACTIVE') }
        ]
      }
    );
    this.pageFilters = filters;
  }

  onFilterBarChange(values: any): void {
    const prevProperty = this.filterPropertyId;
    if (values?.filterPropertyId !== undefined) this.filterPropertyId = values.filterPropertyId;
    if (values?.filterPortal !== undefined) this.filterPortal = values.filterPortal;
    if (values?.filterActive !== undefined) this.filterActive = values.filterActive;
    this.pageIndex = 0;
    if (prevProperty !== this.filterPropertyId) {
      this.loadTenants();
      return;
    }
    this.applyFilters();
  }

  clearFiltersFromBar(): void {
    this.filterPropertyId = null;
    this.filterPortal = null;
    this.filterActive = null;
    this.pageIndex = 0;
    this.loadTenants();
  }

  hasFiltersBar(): boolean {
    return !!this.searchTerm || !!this.filterPropertyId || this.filterPortal !== null || this.filterActive !== null;
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterPropertyId: this.filterPropertyId,
      filterPortal: this.filterPortal,
      filterActive: this.filterActive
    };
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
    this.loadTenants();
  }

  tenantDisplayName(t: Tenant): string {
    return this.isAr ? (t.fullNameAr || t.fullName) : (t.fullNameEn || t.fullName);
  }

  tenantCode(t: Tenant): string {
    return `T-${t.id}`;
  }

  groupPropertyLabels(group: TenantGroup): string {
    const labels = group.contracts.length > 0
      ? group.contracts.map((contract) => contract.propertyName || this.propertyLabel(contract.propertyId))
      : group.entries.map((entry) => this.propertyLabel(entry.propertyId));
    return Array.from(new Set(labels.filter(Boolean))).join(', ') || '-';
  }

  groupUnitLabels(group: TenantGroup): string {
    const labels = group.contracts.length > 0
      ? group.contracts.map((contract) => contract.unitNumber || this.unitLabel(contract.unitId))
      : group.entries.map((entry) => this.unitLabel(entry.unitId));
    return Array.from(new Set(labels.filter(Boolean))).join(', ') || '-';
  }

  displayContracts(group: TenantGroup): LeaseContract[] {
    if (group.contracts.length <= TenantManagementComponent.MAX_VISIBLE_UNITS) {
      return group.contracts;
    }
    return group.contracts.slice(-TenantManagementComponent.MAX_VISIBLE_UNITS);
  }

  displayEntries(group: TenantGroup): Tenant[] {
    if (group.entries.length <= TenantManagementComponent.MAX_VISIBLE_UNITS) {
      return group.entries;
    }
    return group.entries.slice(-TenantManagementComponent.MAX_VISIBLE_UNITS);
  }

  hasMoreUnits(group: TenantGroup): boolean {
    const total = group.contracts.length > 0 ? group.contracts.length : group.entries.length;
    return total > TenantManagementComponent.MAX_VISIBLE_UNITS;
  }

  hiddenUnitsCount(group: TenantGroup): number {
    const total = group.contracts.length > 0 ? group.contracts.length : group.entries.length;
    return Math.max(0, total - TenantManagementComponent.MAX_VISIBLE_UNITS);
  }

  openViewAllUnits(group: TenantGroup): void {
    this.dialog.open(TenantUnitsViewDialogComponent, {
      data: {
        tenantName: this.tenantDisplayName(group.representative),
        contracts: group.contracts,
        entries: group.entries,
        propertyLabel: (id?: number) => this.propertyLabel(id),
        unitLabel: (id?: number) => this.unitLabel(id)
      },
      width: '420px',
      maxHeight: '90vh',
      panelClass: 'app-dialog-panel'
    });
  }

  private applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredTenants = this.tenants.filter((t) => {
      if (this.filterPortal !== null && this.tenantPortalLoginActive(t) !== this.filterPortal) return false;
      if (this.filterActive !== null && this.tenantRowEffectiveActive(t) !== this.filterActive) return false;
      if (!q) return true;
      return t.fullName.toLowerCase().includes(q)
        || (t.fullNameAr ?? '').toLowerCase().includes(q)
        || (t.fullNameEn ?? '').toLowerCase().includes(q)
        || (t.email ?? '').toLowerCase().includes(q)
        || (t.phone ?? '').toLowerCase().includes(q);
    });
    this.recomputeGroups();
  }

  private applyTenantResponse(res: { data?: { content?: Tenant[]; totalElements?: number } }): void {
    this.tenants = res.data?.content ?? [];
    this.totalElements = res.data?.totalElements ?? this.tenants.length;
    this.applyFilters();
    this.loadUnitsForCurrentTenants();
  }

  remove(t: Tenant): void {
    const ar = this.isAr;
    const hasUser = !!t.userId;
    const baseLine = ar ? `هل تريد حذف المستأجر "${t.fullName}"؟` : `Delete tenant "${t.fullName}"?`;
    const userLine = hasUser
      ? (this.i18n.instant('INLINE_TEXT.THIS_WILL_ALSO_DELETE_THE_LINKED_TENANT_PORTAL_USER_ACC'))
      : '';
    const warningLine = this.i18n.instant('INLINE_TEXT.DELETION_WILL_BE_BLOCKED_IF_THEY_HAVE_AN_ACTIVE_LEASE_C');
    this.deleteConfirm.openDeleteConfirm({
      message: [baseLine, userLine, warningLine].filter(Boolean).join('\n')
    }).subscribe((ok) => {
      if (!ok) return;
      this.tenantSvc.delete(t.id).subscribe({
        next: () => { this.snack.success(this.i18n.instant('TENANTS.DELETE_SUCCESS')); this.loadTenants(); },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

  propertyLabel(id?: number): string {
    if (!id) return '—';
    const p = this.propertyById[id];
    return (this.isAr ? p?.propertyNameAr : p?.propertyNameEn) || p?.propertyName || `#${id}`;
  }

  unitLabel(id?: number): string {
    if (!id) return '—';
    return this.unitById[id]?.unitNumber || `#${id}`;
  }

  private loadData(): void {
    this.listLoad.begin();
    forkJoin({
      properties: this.propertySvc.getAll(0, 200).pipe(catchError(() => of({ data: { content: [] as Property[] } } as any))),
      tenants: this.tenantSvc.getAll(this.pageIndex, this.pageSize, this.searchTerm, this.filterPropertyId ?? undefined)
        .pipe(catchError(() => of({ data: { content: [] as Tenant[], totalElements: 0 } } as any)))
    }).subscribe({
      next: ({ properties, tenants }) => {
        this.properties = properties.data?.content ?? [];
        this.propertyById = this.properties.reduce((acc: Record<number, Property>, p: Property) => { acc[p.id] = p; return acc; }, {} as Record<number, Property>);
        this.setupFilters();
        this.applyTenantResponse(tenants);
        this.listLoad.end();
        this.loadActiveContracts();
      },
      error: () => {
        this.listLoad.end();
        this.snack.error(this.i18n.instant('TENANTS.LOAD_ERROR'));
      }
    });
  }

  loadTenants(): void {
    this.listLoad.begin();
    this.tenantSvc.getAll(this.pageIndex, this.pageSize, this.searchTerm, this.filterPropertyId ?? undefined).subscribe({
      next: (res) => {
        this.applyTenantResponse(res);
        this.listLoad.end();
        this.loadActiveContracts();
      },
      error: () => {
        this.listLoad.end();
        this.snack.error(this.i18n.instant('TENANTS.LOAD_ERROR'));
      }
    });
  }

  private loadUnitsForCurrentTenants(): void {
    const propertyIds = [...new Set(this.tenants.map((t) => t.propertyId).filter((id): id is number => !!id))];
    if (!propertyIds.length) return;
    forkJoin(
      propertyIds.map((propertyId) => this.unitSvc.getByProperty(propertyId, 0, 100).pipe(
        map((res) => res.data?.content ?? []),
        catchError(() => of([] as Unit[]))
      ))
    ).subscribe((chunks) => {
      for (const unit of chunks.flat()) {
        this.unitById[unit.id] = unit;
      }
    });
  }
}
