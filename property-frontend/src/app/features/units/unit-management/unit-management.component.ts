import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, NgFor, NgIf, NgClass, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { Property, PropertyService } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Unit, UnitService } from '../../../core/services/unit.service';
import { Tenant, TenantService } from '../../../core/services/tenant.service';
import { UserService } from '../../../core/services/user.service';
import { ContractService } from '../../../core/services/contract.service';
import { LeaseContract } from '../../../core/models/contract.model';
import { ContractDialogComponent } from '../../contracts/contract-dialog/contract-dialog.component';
import { UnitDialogComponent } from '../unit-dialog/unit-dialog.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { PermissionService } from '../../../core/services/permission.service';
import { VacancyService } from '../../../core/services/vacancy.service';

@Component({
  selector: 'app-unit-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    TablePagerComponent,
    TableExportToolbarComponent,
    FilterBarComponent,
    ContractDialogComponent
  ],
  templateUrl: './unit-management.component.html',
  styleUrl: './unit-management.component.scss'
})
export class UnitManagementComponent implements OnInit {
  @ViewChild(FilterBarComponent) private readonly filterBar?: FilterBarComponent;

  loading = true;
  readonly pageSize = 5;

  properties: Property[] = [];
  allUnits: Unit[] = [];
  filteredUnits: Unit[] = [];
  tenantByUnitId: Record<number, string> = {};
  contractByUnitId: Record<number, LeaseContract> = {};
  userById: Record<number, string> = {};
  propertyById: Record<number, Property> = {};

  selectedPropertyId: number | null = null;
  searchTerm = '';
  pageIndex = 0;

  filterUnitNumber = '';
  filterFloor: number | null = null;
  filterUnitType: string | null = null;
  filterStatus: string | null = null;
  filterActive: boolean | null = null;
  unitFilters: FilterSpec[] = [];
  unitTypes: LookupItem[] = [];

  readonly statusOptions = [
    { value: 'rented', labelKey: 'UNITS.RENTED' },
    { value: 'reserved', labelKey: 'UNITS.RESERVED' },
    { value: 'vacant', labelKey: 'DASHBOARD.VACANT_UNITS' }
  ];

  constructor(
    private readonly dialog: MatDialog,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly tenantSvc: TenantService,
    private readonly userSvc: UserService,
    private readonly contractSvc: ContractService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService,
    private readonly permissions: PermissionService,
    private readonly vacancySvc: VacancyService
  ) {}

  publishVacancyLoadingId: number | null = null;

  canCreateUnit(): boolean {
    return this.permissions.can('units', 'create');
  }

  canEditUnit(): boolean {
    return this.permissions.can('units', 'edit');
  }

  canDeleteUnit(): boolean {
    return this.permissions.can('units', 'delete');
  }

  canPublishVacancy(unit: Unit): boolean {
    return !unit.rented && !unit.reserved && this.permissions.can('vacancies', 'create');
  }

  publishVacancy(unit: Unit): void {
    this.publishVacancyLoadingId = unit.id;
    this.vacancySvc.createListing({
      unitId: unit.id,
      propertyId: unit.propertyId,
      askingRent: unit.rentAmount ?? undefined,
      currency: unit.currency
    }).subscribe({
      next: () => {
        this.publishVacancyLoadingId = null;
        this.snack.success('VACANCY.AUTO_PUBLISHED');
      },
      error: (err) => {
        this.publishVacancyLoadingId = null;
        this.snack.error((err as Error)?.message || 'COMMON.ERROR');
      }
    });
  }

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('propertyId');
    if (qp) {
      const n = Number(qp);
      if (!Number.isNaN(n) && n > 0) this.selectedPropertyId = n;
    }
    this.loadUsers();
    this.loadLookupFilters();
    this.loadPropertiesAndUnits();
    this.setupFilters();
  }

  private loadLookupFilters(): void {
    this.lookupCache.preload('UNIT_TYPE').subscribe({
      next: () => {
        this.unitTypes = this.lookupCache.items('UNIT_TYPE');
        this.setupFilters();
      },
      error: () => this.setupFilters()
    });
  }

  private setupFilters(): void {
    const filters: FilterSpec[] = [
      { key: 'filterUnitNumber', label: 'UNITS.UNIT_NUMBER', type: 'text' }
    ];
    if (this.properties.length > 0) {
      filters.push({
        key: 'selectedPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map((p) => ({
          value: p.id,
          label: this.getPropertyLabel(p)
        }))
      });
    }
    filters.push(
      { key: 'filterFloor', label: 'UNITS.FLOOR', type: 'number' },
      {
        key: 'filterUnitType',
        label: 'UNITS.UNIT_TYPE',
        type: 'select',
        options: this.unitTypes.map((type) => ({
          value: type.code,
          label: this.lookupLabel(type)
        }))
      },
      {
        key: 'filterStatus',
        label: 'MAINTENANCE.STATUS',
        type: 'select',
        options: this.statusOptions.map((status) => ({
          value: status.value,
          label: this.i18n.instant(status.labelKey)
        }))
      },
      {
        key: 'filterActive',
        label: 'COMMON.ACTIVE',
        type: 'select',
        options: [
          { value: 'true',  label: this.i18n.instant('COMMON.ACTIVE') },
          { value: 'false', label: this.i18n.instant('COMMON.INACTIVE') }
        ]
      },
    );
    this.unitFilters = filters;
  }

  onFilterBarChange(values: any): void {
    if (values?.filterUnitNumber !== undefined) this.filterUnitNumber = values.filterUnitNumber ?? '';
    if (values?.selectedPropertyId !== undefined) this.selectedPropertyId = this.toNumberOrNull(values.selectedPropertyId);
    if (values?.filterFloor !== undefined) this.filterFloor = this.toNumberOrNull(values.filterFloor);
    if (values?.filterUnitType !== undefined) this.filterUnitType = values.filterUnitType ?? null;
    if (values?.filterStatus !== undefined) this.filterStatus = values.filterStatus ?? null;
    if (values?.filterActive !== undefined) {
      const v = values.filterActive;
      this.filterActive = v === 'true' ? true : v === 'false' ? false : null;
    }
    this.pageIndex = 0;
    this.applyFilters();
  }

  clearFiltersFromBar(): void {
    this.filterBar?.clear();
    this.filterUnitNumber = '';
    this.selectedPropertyId = null;
    this.filterFloor = null;
    this.filterUnitType = null;
    this.filterStatus = null;
    this.filterActive = null;
    this.pageIndex = 0;
    this.applyFilters();
  }

  hasFiltersBar(): boolean {
    return !!(
      this.filterUnitNumber ||
      (this.properties.length > 0 && this.selectedPropertyId) ||
      this.filterFloor !== null ||
      this.filterUnitType ||
      this.filterStatus ||
      this.filterActive !== null
    );
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterUnitNumber: this.filterUnitNumber,
      selectedPropertyId: this.selectedPropertyId,
      filterFloor: this.filterFloor,
      filterUnitType: this.filterUnitType,
      filterStatus: this.filterStatus,
      filterActive: this.filterActive === null ? null : String(this.filterActive)
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
  }

  onPropertyFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
    this.applyFilters();
  }

  applyFiltersManual(): void {
    this.pageIndex = 0;
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedPropertyId = null;
    this.searchTerm = '';
    this.filterUnitNumber = '';
    this.filterFloor = null;
    this.filterUnitType = null;
    this.filterStatus = null;
    this.filterActive = null;
    this.pageIndex = 0;
    this.applyFilters();
  }

  openAddDialog(): void {
    this.dialog.open(UnitDialogComponent, {
      data: { properties: this.properties, unit: null, defaultPropertyId: this.selectedPropertyId ?? undefined, readOnly: false },
      width: '680px',
      maxWidth: '94vw',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => {
      if (ok) this.loadAllUnits();
    });
  }

  openViewDialog(unit: Unit): void {
    this.dialog.open(UnitDialogComponent, {
      data: {
        properties: this.properties,
        unit,
        defaultPropertyId: unit.propertyId,
        readOnly: true,
        leaseContract: this.contractByUnitId[unit.id] ?? null
      },
      width: '760px',
      maxWidth: '94vw',
      panelClass: 'app-dialog-panel',
      disableClose: true
    });
  }

  openEditDialog(unit: Unit): void {
    this.dialog.open(UnitDialogComponent, {
      data: { properties: this.properties, unit, defaultPropertyId: unit.propertyId, readOnly: false },
      width: '680px',
      maxWidth: '94vw',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => {
      if (ok) this.loadAllUnits();
    });
  }

  unitStatusLabelKey(unit: Unit): string {
    if (unit.rented) return 'UNITS.RENTED';
    if (unit.reserved) return 'UNITS.RESERVED';
    return 'DASHBOARD.VACANT_UNITS';
  }

  unitStatusChipClass(unit: Unit): string {
    if (unit.rented) return 'chip-danger';
    if (unit.reserved) return 'chip-warn';
    return 'chip-success';
  }

  deleteUnit(unit: Unit): void {
    if (unit.rented || unit.reserved) return;
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: unit.unitNumber }
    }).subscribe((ok) => {
      if (!ok) return;
      this.unitSvc.delete(unit.id).subscribe({
        next: () => {
          this.snack.success(this.i18n.instant('UNITS.DELETE_SUCCESS'));
          this.loadAllUnits();
        },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

  openAssignTenant(unit: Unit): void {
    this.dialog.open(ContractDialogComponent, {
      width: '980px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { propertyId: unit.propertyId, unitId: unit.id }
    }).afterClosed().subscribe((ok) => {
      if (ok) this.loadAllUnits();
    });
  }

  toggleRented(unit: Unit): void {
    const requested = !unit.rented;
    this.unitSvc.setRentalStatus(unit.id, requested).subscribe({
      next: (res) => {
        const synced = res.data;
        if (synced) {
          unit.rented = synced.rented;
          unit.reserved = !!synced.reserved;
        }
        this.loadAllUnits();
      },
      error: (err: Error) => this.snack.error(err.message || this.i18n.instant('UNITS.SAVE_ERROR'))
    });
  }

  /**
   * Label for who occupies a rented/reserved unit. Lease contract tenant name is authoritative
   * (matches contracts list); tenant registry display name next; linked portal user name only
   * when the former are missing — avoids showing a login name that differs from the lease party.
   */
  tenantName(unit: Unit): string {
    const fromContract = this.contractByUnitId[unit.id]?.tenantName?.trim();
    if (fromContract) return fromContract;
    const fromApi = (this.tenantByUnitId[unit.id] ?? '').trim();
    if (fromApi && fromApi !== '—') return fromApi;
    return '—';
  }

  /** Display name for API tenant row (matches list / contract fallbacks). */
  private tenantRecordDisplayName(tenant: Tenant): string {
    const ar = tenant.fullNameAr?.trim();
    const en = tenant.fullNameEn?.trim();
    const base = tenant.fullName?.trim();
    if (this.i18n.currentLang === 'ar') {
      return ar || base || en || tenant.email?.trim() || tenant.phone?.trim() || '—';
    }
    return en || base || ar || tenant.email?.trim() || tenant.phone?.trim() || '—';
  }

  propertyName(unit: Unit): string {
    const property = this.propertyById[unit.propertyId];
    if (!property) return this.i18n.instant('COMMON.UNKNOWN');
    const name = this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyName)
      : (property.propertyNameEn || property.propertyName);
    return name || this.i18n.instant('COMMON.UNKNOWN');
  }

  getPropertyLabel(property: Property): string {
    const name = this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyName)
      : (property.propertyNameEn || property.propertyName);
    return name || this.i18n.instant('COMMON.UNKNOWN');
  }

  lookupLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  unitTypeLabel(code: string | null | undefined): string {
    if (!code) return '-';
    return this.lookupCache.label('UNIT_TYPE', code) || code;
  }

  /** Display floor index (1-based), not the internal floors.id. */
  displayFloor(unit: Unit): string | number {
    const v = unit.floorNumber ?? unit.floorId;
    return v != null ? v : '-';
  }

  get pagedUnits(): Unit[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredUnits.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUnits.length / this.pageSize));
  }

  get exportColumns(): ExportColumn<Unit>[] {
    return [
      { header: this.i18n.instant('UNITS.UNIT_NUMBER'), value: 'unitNumber' },
      { header: this.i18n.instant('REQUEST_FORM.PROPERTY'), value: (row) => this.propertyName(row) },
      { header: this.i18n.instant('UNITS.FLOOR'), value: (row) => this.displayFloor(row) },
      { header: this.i18n.instant('REQUEST_LIST.TENANT'), value: (row) => this.tenantName(row) },
      { header: this.i18n.instant('UNITS.UNIT_TYPE'), value: (row) => this.unitTypeLabel(row.unitType) },
      { header: this.i18n.instant('UNITS.AREA'), value: (row) => row.areaSqm || '-' },
      {
        header: this.i18n.instant('MAINTENANCE.STATUS'),
        value: (row) => this.i18n.instant(this.unitStatusLabelKey(row))
      }
    ];
  }

  changePage(step: number): void {
    const next = this.pageIndex + step;
    this.pageIndex = Math.max(0, Math.min(next, this.totalPages - 1));
  }

  private loadUsers(): void {
    this.userSvc.getAll(0, 500).subscribe({
      next: (res) => {
        const users = res.data?.content ?? [];
        this.userById = users.reduce((acc, user) => {
          acc[user.id] = (user.fullName || user.username || user.email || `#${user.id}`).trim();
          return acc;
        }, {} as Record<number, string>);
      }
    });
  }

  private loadPropertiesAndUnits(): void {
    this.loading = true;
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        this.propertyById = this.properties.reduce((acc, property) => {
          acc[property.id] = property;
          return acc;
        }, {} as Record<number, Property>);

        this.setupFilters();

        if (!this.properties.some((property) => property.id === this.selectedPropertyId)) {
          this.selectedPropertyId = null;
        }

        this.loadAllUnits();
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('UNITS.LOAD_ERROR'));
      }
    });
  }

  private loadAllUnits(): void {
    if (this.properties.length === 0) {
      this.allUnits = [];
      this.filteredUnits = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    const requests = this.properties.map((property) =>
      this.unitSvc.getByProperty(property.id, 0, 500).pipe(
        map((res) => res.data?.content ?? []),
        catchError(() => of([] as Unit[]))
      )
    );

    forkJoin(requests).subscribe({
      next: (chunks) => {
        this.allUnits = chunks.flat().sort((a, b) => {
          if (a.propertyId !== b.propertyId) return a.propertyId - b.propertyId;
          return (a.unitNumber || '').localeCompare(b.unitNumber || '');
        });

        this.applyFilters();
        this.loadRenterNames();
        this.loadContractsForUnitBadges();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('UNITS.LOAD_ERROR'));
      }
    });
  }

  private applyFilters(): void {
    const query = this.searchTerm.trim().toLowerCase();
    this.filteredUnits = this.allUnits.filter((unit) => {
      if (this.selectedPropertyId && unit.propertyId !== this.selectedPropertyId) return false;

      if (this.filterUnitNumber && !(unit.unitNumber || '').toLowerCase().includes(this.filterUnitNumber.toLowerCase())) return false;
      if (this.filterFloor !== null && (unit.floorNumber ?? unit.floorId) !== this.filterFloor) return false;
      if (this.filterUnitType && unit.unitType !== this.filterUnitType) return false;
      if (this.filterStatus) {
        if (this.filterStatus === 'rented' && !unit.rented) return false;
        if (this.filterStatus === 'reserved' && !unit.reserved) return false;
        if (this.filterStatus === 'vacant' && (unit.rented || !!unit.reserved)) return false;
      }
      if (this.filterActive !== null && unit.active !== this.filterActive) return false;

      if (!query) return true;

      const propertyName = this.propertyName(unit).toLowerCase();
      const unitNumber = (unit.unitNumber || '').toLowerCase();
      const unitType = (unit.unitType || '').toLowerCase();
      const floor =
        unit.floorNumber != null || unit.floorId != null ? String(unit.floorNumber ?? unit.floorId) : '';
      const tenantQ = this.tenantName(unit).toLowerCase();

      return unitNumber.includes(query) || propertyName.includes(query) || unitType.includes(query) || floor.includes(query)
        || (tenantQ !== '—' && tenantQ.includes(query));
    });
    this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
  }

  toggleUnitActive(unit: Unit): void {
    this.unitSvc.toggleActive(unit.id).subscribe({
      next: (res) => {
        if (res?.data) {
          unit.active = res.data.active;
        } else {
          unit.active = !unit.active;
        }
        this.applyFilters();
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  viewContract(unit: Unit): void {
    const c = this.contractByUnitId[unit.id];
    if (c) this.router.navigate(['/admin/contracts', c.id]);
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

  private loadContractsForUnitBadges(): void {
    forkJoin({
      active: this.contractSvc.getAll({ status: 'ACTIVE', size: 500 }),
      draft: this.contractSvc.getAll({ status: 'DRAFT', size: 500 }),
      pending: this.contractSvc.getAll({ status: 'PENDING_OWNER_APPROVAL', size: 500 })
    }).subscribe({
      next: ({ active, draft, pending }) => {
        const rows: LeaseContract[] = [
          ...(active?.data?.content ?? active?.data ?? []),
          ...(draft?.data?.content ?? draft?.data ?? []),
          ...(pending?.data?.content ?? pending?.data ?? [])
        ];
        this.contractByUnitId = this.mergeContractsByUnit(rows);
        // Search/filter can match `tenantName` from contract when profile is tied to another unit.
        this.applyFilters();
      }
    });
  }

  private mergeContractsByUnit(contracts: LeaseContract[]): Record<number, LeaseContract> {
    const priority = (s: string): number =>
      ({ ACTIVE: 4, PENDING_OWNER_APPROVAL: 2, DRAFT: 1 } as Record<string, number>)[s] ?? 0;
    const out: Record<number, LeaseContract> = {};
    for (const c of contracts) {
      if (!c.unitId) continue;
      const prev = out[c.unitId];
      if (!prev || priority(c.status) > priority(prev.status)) {
        out[c.unitId] = c;
      }
    }
    return out;
  }

  private loadRenterNames(): void {
    this.tenantByUnitId = {};
    this.allUnits
      .filter((unit) => unit.rented || !!unit.reserved)
      .forEach((unit) => {
        this.tenantSvc.getByUnitId(unit.id).subscribe({
          next: (tenantRes) => {
            const tenant = tenantRes.data;
            if (!tenant) {
              this.tenantByUnitId[unit.id] = '';
              return;
            }
            const name = this.tenantRecordDisplayName(tenant);
            const fromUser = tenant.userId ? (this.userById[tenant.userId] ?? '').trim() : '';
            this.tenantByUnitId[unit.id] = (name || fromUser).trim() || '';
          },
          error: () => {
            this.tenantByUnitId[unit.id] = '';
          }
        });
      });
  }
}
