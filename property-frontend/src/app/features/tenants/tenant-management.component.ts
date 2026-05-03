import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, NgFor, NgIf, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../shared/components/filter-bar/filter-bar.component';
import { Property, PropertyService } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { DeleteConfirmService } from '../../core/services/delete-confirm.service';
import { Tenant, TenantService } from '../../core/services/tenant.service';
import { Unit, UnitService } from '../../core/services/unit.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { TenantDialogComponent } from './tenant-dialog.component';
import { TenantEditDialogComponent } from './tenant-edit-dialog.component';

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, TranslateModule,
    MatButtonModule, MatProgressSpinnerModule, MatIconModule, MatTooltipModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent, FilterBarComponent
  ],
  templateUrl: './tenant-management.component.html',
  styleUrl: './tenant-management.component.scss'
})
export class TenantManagementComponent implements OnInit {
  loading = true;
  readonly pageSize = 6;
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  properties: Property[] = [];
  propertyById: Record<number, Property> = {};
  unitById: Record<number, Unit> = {};
  filterPropertyId: number | null = null;
  searchTerm = '';
  pageIndex = 0;
  pageFilters: FilterSpec[] = [];

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  constructor(
    private readonly tenantSvc: TenantService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    readonly i18n: I18nService,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog
  ) {}

  goBack(): void { this.location.back(); }

  /** Tenant can sign in when linked to an active system user. */
  tenantPortalLoginActive(t: Tenant): boolean {
    return !!(t.userId && t.linkedUserActive);
  }

  /** «نشط»: سجل المستأجر + إن وُجد مستخدم مرتبط يجب أن يكون الحساب مفعّلاً (مثل تعطيل المستخدم من شاشة المستخدمين). */
  tenantRowEffectiveActive(t: Tenant): boolean {
    if (!t.active) return false;
    if (t.userId) return !!t.linkedUserActive;
    return true;
  }

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
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.loadTenants(); });
  }

  openTenantDetails(tenant: Tenant): void {
    this.dialog
      .open(TenantEditDialogComponent, {
        data: { tenantId: tenant.id, properties: this.properties, readOnly: true },
        width: '640px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'app-dialog-panel'
      })
      .afterClosed()
      .subscribe(() => { /* view-only */ });
  }

  openTenantEdit(tenant: Tenant): void {
    this.dialog
      .open(TenantEditDialogComponent, {
        data: { tenantId: tenant.id, properties: this.properties },
        width: '640px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'app-dialog-panel',
        disableClose: true
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.loadTenants();
      });
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      }
    ];
  }

  onFilterBarChange(values: any): void {
    const prev = this.filterPropertyId;
    if (values?.filterPropertyId !== undefined) this.filterPropertyId = values.filterPropertyId;
    this.pageIndex = 0;
    if (prev !== this.filterPropertyId) {
      this.loadTenants();
    } else {
      this.applyFilters();
    }
  }

  clearFiltersFromBar(): void {
    this.filterPropertyId = null;
    this.pageIndex = 0;
    this.loadTenants();
  }

  hasFiltersBar(): boolean {
    return !!this.filterPropertyId;
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

  tenantDisplayName(t: Tenant): string {
    return this.isAr ? (t.fullNameAr || t.fullName) : (t.fullNameEn || t.fullName);
  }

  private applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredTenants = this.tenants.filter((t) => {
      if (!q) return true;
      return t.fullName.toLowerCase().includes(q)
        || (t.fullNameAr ?? '').toLowerCase().includes(q)
        || (t.fullNameEn ?? '').toLowerCase().includes(q)
        || (t.email ?? '').toLowerCase().includes(q)
        || (t.phone ?? '').toLowerCase().includes(q);
    });
  }

  get pagedTenants(): Tenant[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredTenants.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTenants.length / this.pageSize));
  }

  changePage(step: number): void {
    const next = this.pageIndex + step;
    this.pageIndex = Math.max(0, Math.min(next, this.totalPages - 1));
  }

  remove(t: Tenant): void {
    this.deleteConfirm.openDeleteConfirm({
      messageKey: 'DIALOG.DELETE_NAMED',
      messageParams: { name: t.fullName }
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
    this.loading = true;
    this.propertySvc.getAll(0, 500).pipe(catchError(() => of({ data: { content: [] as Property[] } } as any)))
      .subscribe((res: any) => {
        this.properties = res.data?.content ?? [];
        this.propertyById = this.properties.reduce((acc: Record<number, Property>, p: Property) => { acc[p.id] = p; return acc; }, {} as Record<number, Property>);
        this.setupFilters();
        this.loadAllUnits();
        this.loadTenants();
      });
  }

  loadTenants(): void {
    this.tenantSvc.getAll(0, 500, '', this.filterPropertyId ?? undefined).subscribe({
      next: (res) => {
        this.tenants = res.data?.content ?? [];
        this.applyFilters();
        this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('TENANTS.LOAD_ERROR'));
      }
    });
  }

  private loadAllUnits(): void {
    if (!this.properties.length) return;
    forkJoin(
      this.properties.map((p) => this.unitSvc.getByProperty(p.id, 0, 500).pipe(
        map((res) => res.data?.content ?? []),
        catchError(() => of([] as Unit[]))
      ))
    ).subscribe((chunks) => {
      const all = chunks.flat();
      this.unitById = all.reduce((acc, u) => { acc[u.id] = u; return acc; }, {} as Record<number, Unit>);
    });
  }
}
