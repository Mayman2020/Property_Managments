import { Component, DestroyRef, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { PropertyService, Property } from '../../../core/services/property.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppConstants } from '../../../core/constants/app-constants';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Owner, ownerDisplayName } from '../../../core/services/owner.service';
import { SnackService } from '../../../core/services/snack.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { UnitService } from '../../../core/services/unit.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { Location } from '@angular/common';
import { PropertyFormComponent } from '../property-form/property-form.component';
import { PermissionService } from '../../../core/services/permission.service';

interface PropertyAccessSummaryDto {
  unrestricted: boolean;
  propertyIds: number[];
}

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TablePagerComponent,
    MatFormFieldModule,
    MatSelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
    TableExportToolbarComponent,
    FilterBarComponent
  ],
  templateUrl: './property-list.component.html',
  styleUrl: './property-list.component.scss'
})
export class PropertyListComponent implements OnInit {
  @ViewChild(FilterBarComponent) private readonly filterBar?: FilterBarComponent;

  properties: Property[] = [];
  loading = true;
  totalElements = 0;
  page = 0;
  readonly pageSize = 5;
  occupancyByPropertyId: Partial<Record<number, { occupied: number; total: number }>> = {};

  searchTerm = '';
  filterType: string | null = null;
  filterStatus: boolean | null = null;
  showFilters = false;
  pageFilters: FilterSpec[] = [];
  propertyTypes: LookupItem[] = [];
  propertyStatuses: LookupItem[] = [];

  /** From {@code GET /users/me/property-access} — drives scoped filter UI. */
  scopeSummary: PropertyAccessSummaryDto | null = null;
  /** When scoped to multiple properties, narrowed list request uses this id (default: first in {@link scopeSummary#propertyIds}). */
  selectedScopedPropertyId: number | null = null;
  /** Labels for the scope dropdown (subset of all accessible properties). */
  scopePropertyOptions: Property[] = [];

  constructor(
    private readonly dialog: MatDialog,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly lookupCache: LookupCacheService,
    readonly i18n: I18nService,
    private readonly permissions: PermissionService,
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly destroyRef: DestroyRef,
    private readonly location: Location
  ) {
    this.auth.activeRoleChanged.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page = 0;
      this.initPropertyAccessAndLoad();
    });
  }

  canCreateProperty(): boolean {
    return this.permissions.can('properties', 'create');
  }

  canEditProperty(): boolean {
    return this.permissions.can('properties', 'edit');
  }

  canDeleteProperty(): boolean {
    return this.permissions.can('properties', 'delete');
  }

  ngOnInit(): void {
    this.loadFilterLookups();
    this.initPropertyAccessAndLoad();
  }

  showPropertyScopeFilter(): boolean {
    return !!this.scopeSummary && !this.scopeSummary.unrestricted && this.scopeSummary.propertyIds.length > 1;
  }

  onScopedPropertyChange(propertyId: number): void {
    this.selectedScopedPropertyId = propertyId;
    this.page = 0;
    this.load();
  }

  private initPropertyAccessAndLoad(): void {
    this.loading = true;
    this.api.get<ApiResponse<PropertyAccessSummaryDto>>(AppConstants.API.USERS_ME_PROPERTY_ACCESS).subscribe({
      next: (res) => {
        const data = res.data ?? null;
        this.scopeSummary = data;
        this.scopePropertyOptions = [];
        if (!data || data.unrestricted) {
          this.selectedScopedPropertyId = null;
          this.load();
          return;
        }
        if (data.propertyIds.length > 1) {
          this.selectedScopedPropertyId = data.propertyIds[0] ?? null;
          this.propertySvc.getAll(0, 200, '').subscribe({
            next: (r2) => {
              const rows = r2.data?.content ?? [];
              const order = new Map(data.propertyIds.map((id, i) => [id, i]));
              this.scopePropertyOptions = rows
                .filter((p) => data.propertyIds.includes(p.id))
                .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
              this.load();
            },
            error: () => this.load()
          });
          return;
        }
        this.selectedScopedPropertyId = null;
        this.load();
      },
      error: () => {
        this.scopeSummary = null;
        this.selectedScopedPropertyId = null;
        this.scopePropertyOptions = [];
        this.load();
      }
    });
  }

  private narrowPropertyIdForRequest(): number | undefined {
    if (!this.scopeSummary || this.scopeSummary.unrestricted) return undefined;
    if (this.selectedScopedPropertyId != null) return this.selectedScopedPropertyId;
    return undefined;
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'filterType',
        label: 'PROPERTY_FORM.PROPERTY_TYPE',
        type: 'select',
        options: this.propertyTypes.map(type => ({
          value: type.code,
          label: this.lookupLabel(type)
        }))
      },
      {
        key: 'filterStatus',
        label: 'MAINTENANCE.STATUS',
        type: 'select',
        options: this.propertyStatuses
          .map(status => ({
            value: this.statusCodeToBoolean(status.code),
            label: this.lookupLabel(status)
          }))
          .filter((option): option is { value: boolean; label: string } => option.value !== null)
      }
    ];
  }

  private loadFilterLookups(): void {
    this.lookupCache.preload('PROPERTY_TYPE', 'PROPERTY_STATUS').subscribe({
      next: () => {
        this.propertyTypes = this.lookupCache.items('PROPERTY_TYPE');
        this.propertyStatuses = this.lookupCache.items('PROPERTY_STATUS');
        this.setupFilters();
      },
      error: () => this.setupFilters()
    });
  }

  onFilterBarChange(values: any): void {
    if (values?.filterType !== undefined) this.filterType = values.filterType;
    if (values?.filterStatus !== undefined) this.filterStatus = values.filterStatus;
  }

  clearFiltersFromBar(): void {
    this.filterBar?.clear();
    this.filterType = null;
    this.filterStatus = null;
  }

  hasFiltersBar(): boolean {
    return this.filterType !== null || this.filterStatus !== null;
  }

  get filterValues(): Record<string, unknown> {
    return {
      filterType: this.filterType,
      filterStatus: this.filterStatus
    };
  }

  get filteredProperties(): Property[] {
    return this.properties.filter(p => {
      const matchType = !this.filterType || p.propertyType === this.filterType;
      const matchStatus = this.filterStatus === null || p.isActive === this.filterStatus;
      return matchType && matchStatus;
    });
  }

  get activeCount(): number {
    return this.filteredProperties.filter((property) => property.isActive).length;
  }

  get inactiveCount(): number {
    return this.filteredProperties.filter((property) => !property.isActive).length;
  }

  get averageOccupancy(): number {
    if (!this.filteredProperties.length) return 0;
    const total = this.filteredProperties.reduce((sum, property) => sum + this.occupancy(property), 0);
    return Math.round(total / this.filteredProperties.length);
  }

  /** Sum of unit counts for properties on the current list (after client filters). */
  get totalUnitsInSummary(): number {
    return this.filteredProperties.reduce(
      (sum, p) => sum + (this.occupancyByPropertyId[p.id]?.total ?? p.totalUnits ?? 0),
      0
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.pageSize));
  }

  get pageStart(): number {
    if (!this.totalElements) return 0;
    return this.page * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min((this.page + 1) * this.pageSize, this.totalElements);
  }

  get exportColumns(): ExportColumn<Property>[] {
    return [
      { header: this.i18n.instant('PROPERTY_FORM.PROPERTY_CODE'), value: (row) => row.propertyCode || '-' },
      { header: this.i18n.instant('PROPERTY_FORM.PROPERTY_NAME'), value: (row) => this.propertyName(row) },
      { header: this.i18n.instant('PROPERTY_FORM.CITY'), value: (row) => row.city || '-' },
      { header: this.i18n.instant('PROPERTY_FORM.PROPERTY_TYPE'), value: (row) => this.typeLabel(row.propertyType) },
      { header: this.i18n.instant('PROPERTY_LIST.UNITS'), value: (row) => this.occupancyByPropertyId[row.id]?.total ?? row.totalUnits ?? 0 },
      { header: this.i18n.instant('MAINTENANCE.STATUS'), value: (row) => this.statusLabel(row.isActive) },
      { header: this.i18n.instant('PROPERTY_LIST.OWNER'), value: (row) => this.ownerName(row) }
    ];
  }

  readonly loadExportProperties = async (): Promise<Property[]> => {
    const size = Math.max(this.totalElements || 0, this.pageSize, 500);
    const res = await firstValueFrom(
      this.propertySvc.getAll(0, size, this.searchTerm, this.narrowPropertyIdForRequest() ?? null)
    );
    const items = res.data?.content ?? [];
    return items.filter((property) => {
      const matchType = !this.filterType || property.propertyType === this.filterType;
      const matchStatus = this.filterStatus === null || property.isActive === this.filterStatus;
      return matchType && matchStatus;
    });
  };

  load(): void {
    this.loading = true;
    const narrowPid = this.narrowPropertyIdForRequest();
    this.propertySvc.getAll(this.page, this.pageSize, this.searchTerm, narrowPid ?? null).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        this.totalElements = res.data?.totalElements ?? 0;

        if (!this.properties.length) {
          this.occupancyByPropertyId = {};
          this.loading = false;
          return;
        }

        forkJoin(
          this.properties.map((property) =>
            this.unitSvc.getByProperty(property.id, 0, 400).pipe(
              map((unitsRes) => ({
                propertyId: property.id,
                total: unitsRes.data?.content?.length ?? property.totalUnits ?? 0,
                occupied: (unitsRes.data?.content ?? []).filter((unit) => unit.rented).length
              })),
              catchError(() =>
                of({
                  propertyId: property.id,
                  total: property.totalUnits ?? 0,
                  occupied: property.totalUnits ?? 0
                })
              )
            )
          )
        ).subscribe({
          next: (stats) => {
            this.occupancyByPropertyId = stats.reduce((acc, item) => {
              acc[item.propertyId] = { occupied: item.occupied, total: item.total };
              return acc;
            }, {} as Record<number, { occupied: number; total: number }>);
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('PROPERTY_LIST.LOAD_ERROR'));
      }
    });
  }

  onPageIndexChange(index: number): void {
    this.page = index;
    this.load();
  }

  goBack(): void {
    this.location.back();
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.page = 0;
    this.load();
  }

  setTypeFilter(type: string | null): void {
    this.filterType = type;
  }

  setStatusFilter(status: boolean | null): void {
    this.filterStatus = status;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearFilters(): void {
    this.filterType = null;
    this.filterStatus = null;
  }

  openAddDialog(): void {
    this.dialog.open(PropertyFormComponent, {
      width: '980px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'app-dialog-panel',
      data: { mode: 'create' },
      disableClose: true
    }).afterClosed().subscribe((saved) => {
      if (saved) this.load();
    });
  }

  openViewDialog(property: Property): void {
    this.dialog.open(PropertyFormComponent, {
      width: '980px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'app-dialog-panel',
      data: { propertyId: property.id, mode: 'view' },
      disableClose: true
    });
  }

  openEditDialog(property: Property): void {
    this.dialog.open(PropertyFormComponent, {
      width: '980px',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'app-dialog-panel',
      data: { propertyId: property.id, mode: 'edit' },
      disableClose: true
    }).afterClosed().subscribe((saved) => {
      if (saved) this.load();
    });
  }

  typeLabel(type: string): string {
    return this.lookupCache.label('PROPERTY_TYPE', type) || type;
  }

  statusLabel(active: boolean): string {
    const status = this.propertyStatuses.find((item) => this.statusCodeToBoolean(item.code) === active);
    return status ? this.lookupLabel(status) : this.i18n.instant(active ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE');
  }

  private lookupLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  private statusCodeToBoolean(code: string): boolean | null {
    if (code === 'ACTIVE') return true;
    if (code === 'INACTIVE') return false;
    return null;
  }

  occupancy(property: Property): number {
    const stats = this.occupancyByPropertyId[property.id];
    if (!stats?.total) return 0;
    return Math.round((stats.occupied / stats.total) * 100);
  }

  vacantUnits(property: Property): number {
    const stats = this.occupancyByPropertyId[property.id];
    if (!stats) return 0;
    return Math.max(0, stats.total - stats.occupied);
  }

  propertyId(property: Property): number {
    return Number((property as Property & { propertyId?: number }).id ?? (property as Property & { propertyId?: number }).propertyId);
  }

  propertyName(property: Property): string {
    return this.i18n.currentLang === 'ar'
      ? (property.propertyNameAr || property.propertyName)
      : (property.propertyNameEn || property.propertyName);
  }

  toggleActive(property: Property): void {
    this.propertySvc.toggleActive(property.id).subscribe({
      next: (res) => {
        property.isActive = res.data?.isActive ?? !property.isActive;
        this.snack.success(this.i18n.instant(property.isActive ? 'PROPERTY_LIST.ACTIVATED' : 'PROPERTY_LIST.DEACTIVATED'));
      },
      error: (err: Error) => this.snack.error(err.message)
    });
  }

  deleteProperty(property: Property): void {
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: this.propertyName(property) }
    }).subscribe((ok) => {
      if (!ok) return;
      this.propertySvc.delete(property.id).subscribe({
        next: () => {
          this.snack.success(this.i18n.instant('PROPERTY_LIST.DELETED'));
          this.load();
        },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

  ownerName(property: Property): string {
    const primary = property.owners?.[0];
    if (!primary) return '-';
    const o: Owner = {
      id: primary.id,
      fullName: primary.fullName,
      fullNameAr: primary.fullNameAr,
      fullNameEn: primary.fullNameEn,
      active: true,
      portalAccess: false
    };
    return ownerDisplayName(o, this.i18n.currentLang) || primary.fullName || '-';
  }
}
