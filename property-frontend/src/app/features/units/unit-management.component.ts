import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../shared/components/table-export-toolbar/table-export-toolbar.component';
import { Property, PropertyService } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Unit, UnitService } from '../../core/services/unit.service';
import { TenantService } from '../../core/services/tenant.service';
import { UserService } from '../../core/services/user.service';
import { UnitDialogComponent } from '../units/unit-dialog.component';

@Component({
  selector: 'app-unit-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    PageHeaderComponent,
    EmptyStateComponent,
    TablePagerComponent,
    TableExportToolbarComponent
  ],
  templateUrl: './unit-management.component.html',
  styleUrl: './unit-management.component.scss'
})
export class UnitManagementComponent implements OnInit {
  loading = true;
  readonly pageSize = 5;

  properties: Property[] = [];
  allUnits: Unit[] = [];
  filteredUnits: Unit[] = [];
  tenantByUnitId: Record<number, string> = {};
  userById: Record<number, string> = {};
  propertyById: Record<number, Property> = {};

  selectedPropertyId: number | null = null;
  searchTerm = '';
  pageIndex = 0;

  constructor(
    private readonly dialog: MatDialog,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly tenantSvc: TenantService,
    private readonly userSvc: UserService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadPropertiesAndUnits();
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

  clearFilters(): void {
    this.selectedPropertyId = null;
    this.searchTerm = '';
    this.pageIndex = 0;
    this.applyFilters();
  }

  openAddDialog(): void {
    this.dialog.open(UnitDialogComponent, {
      data: { properties: this.properties, unit: null, defaultPropertyId: this.selectedPropertyId ?? undefined },
      width: '680px',
      maxWidth: '94vw',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe((ok) => {
      if (ok) this.loadAllUnits();
    });
  }

  openEditDialog(unit: Unit): void {
    this.dialog.open(UnitDialogComponent, {
      data: { properties: this.properties, unit, defaultPropertyId: unit.propertyId },
      width: '680px',
      maxWidth: '94vw',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe((ok) => {
      if (ok) this.loadAllUnits();
    });
  }

  toggleRented(unit: Unit): void {
    this.unitSvc.setRentalStatus(unit.id, !unit.rented).subscribe({
      next: () => {
        unit.rented = !unit.rented;
        this.loadAllUnits();
      },
      error: (err: Error) => this.snack.error(err.message || this.i18n.instant('UNITS.SAVE_ERROR'))
    });
  }

  tenantName(unit: Unit): string {
    return this.tenantByUnitId[unit.id] || '—';
  }

  propertyName(unit: Unit): string {
    const property = this.propertyById[unit.propertyId];
    return (this.i18n.currentLang === 'ar' ? property?.propertyNameAr : property?.propertyNameEn) || property?.propertyName || `#${unit.propertyId}`;
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
      { header: this.i18n.instant('UNITS.FLOOR'), value: (row) => row.floorId || '-' },
      { header: this.i18n.instant('REQUEST_LIST.TENANT'), value: (row) => this.tenantName(row) },
      { header: this.i18n.instant('UNITS.UNIT_TYPE'), value: (row) => row.unitType || '-' },
      { header: this.i18n.instant('UNITS.AREA'), value: (row) => row.areaSqm || '-' },
      { header: this.i18n.instant('MAINTENANCE.STATUS'), value: (row) => this.i18n.instant(row.rented ? 'UNITS.RENTED' : 'DASHBOARD.VACANT_UNITS') }
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
      if (!query) return true;

      const propertyName = this.propertyName(unit).toLowerCase();
      const unitNumber = (unit.unitNumber || '').toLowerCase();
      const unitType = (unit.unitType || '').toLowerCase();
      const floor = unit.floorId != null ? String(unit.floorId) : '';

      return unitNumber.includes(query) || propertyName.includes(query) || unitType.includes(query) || floor.includes(query);
    });
    this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
  }

  private loadRenterNames(): void {
    this.tenantByUnitId = {};
    this.allUnits
      .filter((unit) => unit.rented)
      .forEach((unit) => {
        this.tenantSvc.getByUnitId(unit.id).subscribe({
          next: (tenantRes) => {
            const tenant = tenantRes.data;
            const fromUser = tenant?.userId ? this.userById[tenant.userId] : '';
            this.tenantByUnitId[unit.id] = fromUser || tenant?.fullName || '—';
          },
          error: () => {
            this.tenantByUnitId[unit.id] = '—';
          }
        });
      });
  }
}
