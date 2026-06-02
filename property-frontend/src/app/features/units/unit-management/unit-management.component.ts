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
import { forkJoin } from 'rxjs';

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
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { TableEntityCellComponent } from '../../../shared/components/table-entity-cell/table-entity-cell.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { PermissionService } from '../../../core/services/permission.service';
import { VacancyService } from '../../../core/services/vacancy.service';
import { ListLoadController } from '../../../shared/utils/list-load.util';

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
    SearchableSelectComponent,
    TableEntityCellComponent,
    TableRowIndexPipe,
    ContractDialogComponent
  ],
  templateUrl: './unit-management.component.html',
  styleUrl: './unit-management.component.scss'
})
export class UnitManagementComponent implements OnInit {
  @ViewChild(FilterBarComponent) private readonly filterBar?: FilterBarComponent;

  listLoad = new ListLoadController();
  readonly pageSize = 5;

  properties: Property[] = [];
  units: Unit[] = [];
  totalElements = 0;
  tenantByUnitId: Record<number, string> = {};
  contractByUnitId: Record<number, LeaseContract> = {};
  userById: Record<number, string> = {};
  propertyById: Record<number, Property> = {};

  selectedPropertyId: number | null = null;
  searchTerm = '';
  pageIndex = 0;

  filterUnitNumber = '';
  filterUnitType: string | null = null;
  filterStatus: string | null = null;
  unitFilters: FilterSpec[] = [];
  private propertySearchTimer?: ReturnType<typeof setTimeout>;
  unitTypes: LookupItem[] = [];

  readonly statusOptions = [
    { value: 'rented', labelKey: 'UNITS.RENTED' },
    { value: 'reserved', labelKey: 'UNITS.RESERVED' },
    { value: 'vacant', labelKey: 'UNITS.VACANT' }
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
    return !unit.rented && !unit.reserved && !unit.vacancyPublished && this.permissions.can('vacancies', 'create');
  }

  canUnpublishVacancy(unit: Unit): boolean {
    return !unit.rented && !unit.reserved && !!unit.vacancyPublished && this.permissions.can('vacancies', 'create');
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
        unit.vacancyPublished = true;
        this.publishVacancyLoadingId = null;
        this.snack.success('VACANCY.AUTO_PUBLISHED');
      },
      error: (err) => {
        this.publishVacancyLoadingId = null;
        this.snack.error((err as Error)?.message || 'COMMON.ERROR');
      }
    });
  }

  unpublishVacancy(unit: Unit): void {
    this.publishVacancyLoadingId = unit.id;
    this.vacancySvc.unpublishListing(unit.id).subscribe({
      next: () => {
        unit.vacancyPublished = false;
        this.publishVacancyLoadingId = null;
        this.snack.success('VACANCY.UNPUBLISHED');
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
    this.loadProperties();
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
    this.unitFilters = [
      { key: 'filterUnitNumber', label: 'UNITS.UNIT_NUMBER', type: 'text' },
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
      }
    ];
  }

  onFilterBarChange(values: any): void {
    if (values?.filterUnitNumber !== undefined) this.filterUnitNumber = values.filterUnitNumber ?? '';
    if (values?.filterUnitType !== undefined) this.filterUnitType = values.filterUnitType ?? null;
    if (values?.filterStatus !== undefined) this.filterStatus = values.filterStatus ?? null;
    this.pageIndex = 0;
    this.loadUnits();
  }

  clearFiltersFromBar(): void {
    this.filterBar?.clear();
    this.filterUnitNumber = '';
    this.selectedPropertyId = null;
    this.filterUnitType = null;
    this.filterStatus = null;
    this.pageIndex = 0;
    this.loadPropertyOptions();
    this.loadUnits();
  }

  hasFiltersBar(): boolean {
    return !!(
      this.filterUnitNumber ||
      this.selectedPropertyId ||
      this.filterUnitType ||
      this.filterStatus
    );
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterUnitNumber: this.filterUnitNumber,
      filterUnitType: this.filterUnitType,
      filterStatus: this.filterStatus
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
  }

  onPropertyFilterChange(): void {
    this.pageIndex = 0;
    this.loadUnits();
  }

  onPropertySearchQuery(q: string): void {
    if (this.propertySearchTimer) clearTimeout(this.propertySearchTimer);
    this.propertySearchTimer = setTimeout(() => this.loadPropertyOptions(q), 300);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
    this.loadUnits();
  }

  applyFiltersManual(): void {
    this.pageIndex = 0;
    this.loadUnits();
  }

  clearFilters(): void {
    this.selectedPropertyId = null;
    this.searchTerm = '';
    this.filterUnitNumber = '';
    this.filterUnitType = null;
    this.filterStatus = null;
    this.pageIndex = 0;
    this.loadPropertyOptions();
    this.loadUnits();
  }

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.loadUnits();
  }

  openAddDialog(): void {
    this.dialog.open(UnitDialogComponent, {
      data: { properties: this.properties, unit: null, defaultPropertyId: this.selectedPropertyId ?? undefined, readOnly: false },
      width: '680px',
      maxWidth: '94vw',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => {
      if (ok) this.loadUnits();
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
      if (ok) this.loadUnits();
    });
  }

  unitStatusLabelKey(unit: Unit): string {
    if (unit.rented) return 'UNITS.RENTED';
    if (unit.reserved) return 'UNITS.RESERVED';
    return 'UNITS.VACANT';
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
          this.loadUnits();
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
      if (ok) this.loadUnits();
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
        this.loadUnits();
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
    return this.units;
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
    const totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
    const next = this.pageIndex + step;
    this.onPageChange(Math.max(0, Math.min(next, totalPages - 1)));
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

  private loadProperties(): void {
    if (this.selectedPropertyId) {
      forkJoin({
        list: this.propertySvc.getAll(0, 50),
        selected: this.propertySvc.getById(this.selectedPropertyId)
      }).subscribe({
        next: ({ list, selected }) => {
          const content = list.data?.content ?? [];
          const picked = selected.data;
          if (picked) {
            this.propertyById[picked.id] = picked;
          }
          this.properties = picked && !content.some((p) => p.id === picked.id)
            ? [picked, ...content]
            : content;
          for (const property of this.properties) {
            this.propertyById[property.id] = property;
          }
          this.loadUnits();
        },
        error: () => this.loadPropertyOptions(undefined, true)
      });
      return;
    }
    this.loadPropertyOptions(undefined, true);
  }

  /** Loads property dropdown options (server LIKE via `q`) without reloading units unless requested. */
  private loadPropertyOptions(q?: string, loadUnitsAfter = false): void {
    this.propertySvc.getAll(0, 50, q?.trim() || undefined).subscribe({
      next: (res) => {
        this.properties = this.ensureSelectedPropertyInList(res.data?.content ?? []);
        for (const property of this.properties) {
          this.propertyById[property.id] = property;
        }
        if (loadUnitsAfter) {
          this.loadUnits();
        }
      },
      error: () => {
        if (loadUnitsAfter) {
          this.properties = [];
          this.loadUnits();
        }
      }
    });
  }

  private ensureSelectedPropertyInList(list: Property[]): Property[] {
    if (!this.selectedPropertyId || list.some((p) => p.id === this.selectedPropertyId)) {
      return list;
    }
    const selected = this.propertyById[this.selectedPropertyId];
    return selected ? [selected, ...list] : list;
  }

  private loadUnits(): void {
    this.listLoad.begin();
    const q = (this.filterUnitNumber.trim() || this.searchTerm.trim()) || undefined;
    this.unitSvc.getAll(this.pageIndex, this.pageSize, {
      propertyId: this.selectedPropertyId,
      q,
      unitType: this.filterUnitType,
      status: this.filterStatus
    }).subscribe({
      next: (res) => {
        this.units = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? this.units.length;
        this.loadRenterNames();
        this.loadContractsForUnitBadges();
        this.listLoad.end();
      },
      error: () => {
        this.listLoad.end();
        this.snack.error(this.i18n.instant('UNITS.LOAD_ERROR'));
      }
    });
  }

  toggleUnitActive(unit: Unit): void {
    this.unitSvc.toggleActive(unit.id).subscribe({
      next: (res) => {
        if (res?.data) {
          unit.active = res.data.active;
        } else {
          unit.active = !unit.active;
        }
        this.loadUnits();
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
    const unitIds = new Set(this.units.map((unit) => unit.id));
    if (unitIds.size === 0) {
      this.contractByUnitId = {};
      return;
    }
    forkJoin({
      active: this.contractSvc.getAll({ status: 'ACTIVE', page: 0, size: 200 }),
      draft: this.contractSvc.getAll({ status: 'DRAFT', page: 0, size: 200 }),
      pending: this.contractSvc.getAll({ status: 'PENDING_OWNER_APPROVAL', page: 0, size: 200 })
    }).subscribe({
      next: ({ active, draft, pending }) => {
        const rows: LeaseContract[] = [
          ...(active?.data?.content ?? active?.data ?? []),
          ...(draft?.data?.content ?? draft?.data ?? []),
          ...(pending?.data?.content ?? pending?.data ?? [])
        ].filter((c) => c.unitId && unitIds.has(c.unitId));
        this.contractByUnitId = this.mergeContractsByUnit(rows);
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
    this.units
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
