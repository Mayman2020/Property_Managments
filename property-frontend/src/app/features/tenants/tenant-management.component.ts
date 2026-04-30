import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Property, PropertyService } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { Tenant, TenantService } from '../../core/services/tenant.service';
import { Unit, UnitService } from '../../core/services/unit.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TenantDialogComponent } from './tenant-dialog.component';

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, FormsModule, TranslateModule,
    MatButtonModule, MatProgressSpinnerModule,
    PageHeaderComponent, EmptyStateComponent, TablePagerComponent
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
  tenantUsers: User[] = [];
  filterPropertyId: number | null = null;
  pageIndex = 0;

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  constructor(
    private readonly tenantSvc: TenantService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly userSvc: UserService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  openAddDialog(): void {
    this.dialog.open(TenantDialogComponent, {
      data: { properties: this.properties, tenantUsers: this.tenantUsers, defaultPropertyId: this.filterPropertyId ?? undefined },
      width: '640px',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe((ok) => { if (ok) this.loadTenants(); });
  }

  onPropertyFilterChange(): void {
    this.pageIndex = 0;
    if (this.filterPropertyId) {
      this.filteredTenants = this.tenants.filter((t) => t.propertyId === this.filterPropertyId);
    } else {
      this.filteredTenants = [...this.tenants];
    }
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
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.isAr ? 'حذف المستأجر' : 'Delete Tenant',
        message: this.isAr ? `هل أنت متأكد من حذف "${t.fullName}"؟` : `Delete "${t.fullName}"?`,
        confirmLabel: this.isAr ? 'حذف' : 'Delete',
        danger: true
      },
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.tenantSvc.delete(t.id).subscribe({
        next: () => { this.snack.success(this.i18n.instant('TENANTS.DELETE_SUCCESS')); this.loadTenants(); },
        error: (err: Error) => this.snack.error(err.message || this.i18n.instant('TENANTS.SAVE_ERROR'))
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
    forkJoin({
      properties: this.propertySvc.getAll(0, 500).pipe(catchError(() => of({ data: { content: [] as Property[] } }))),
      users: this.userSvc.getAll(0, 500).pipe(catchError(() => of({ data: { content: [] as User[] } })))
    }).subscribe(({ properties, users }) => {
      this.properties = properties.data?.content ?? [];
      this.propertyById = this.properties.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<number, Property>);
      this.tenantUsers = (users.data?.content ?? []).filter((u) => u.role === 'TENANT' && u.isActive);
      this.loadAllUnits();
      this.loadTenants();
    });
  }

  loadTenants(): void {
    this.tenantSvc.getAll(0, 200, '').subscribe({
      next: (res) => {
        this.tenants = res.data?.content ?? [];
        this.filteredTenants = this.filterPropertyId
          ? this.tenants.filter((t) => t.propertyId === this.filterPropertyId)
          : [...this.tenants];
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
