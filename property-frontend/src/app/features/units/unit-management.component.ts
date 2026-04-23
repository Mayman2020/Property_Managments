import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { Property, PropertyService } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Unit, UnitRequest, UnitService } from '../../core/services/unit.service';
import { TenantService } from '../../core/services/tenant.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-unit-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, ReactiveFormsModule, TranslateModule,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    PageHeaderComponent, EmptyStateComponent
  ],
  templateUrl: './unit-management.component.html',
  styleUrl: './unit-management.component.scss'
})
export class UnitManagementComponent implements OnInit {
  loading = true;
  saving = false;
  showForm = false;

  properties: Property[] = [];
  allUnits: Unit[] = [];
  filteredUnits: Unit[] = [];
  tenantByUnitId: Record<number, string> = {};
  userById: Record<number, string> = {};
  propertyById: Record<number, Property> = {};

  selectedPropertyId: number | null = null;
  searchTerm = '';

  form: FormGroup;
  editingId: number | null = null;

  readonly unitTypes: Array<UnitRequest['unitType']> = ['APARTMENT', 'SHOP', 'OFFICE', 'VILLA', 'WAREHOUSE', 'OTHER'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly tenantSvc: TenantService,
    private readonly userSvc: UserService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      propertyId: [null, Validators.required],
      floorId: [null],
      unitNumber: ['', Validators.required],
      unitType: ['APARTMENT', Validators.required],
      areaSqm: [null],
      bedrooms: [null],
      bathrooms: [null],
      rentAmount: [null],
      currency: ['OMR'],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadPropertiesAndUnits();
  }

  onPropertyFilterChange(): void {
    this.applyFilters();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedPropertyId = null;
    this.searchTerm = '';
    this.applyFilters();
  }

  startCreate(): void {
    this.showForm = true;
    this.editingId = null;
    this.form.reset({ propertyId: this.selectedPropertyId, unitType: 'APARTMENT', currency: 'OMR' });
  }

  startEdit(unit: Unit): void {
    this.showForm = true;
    this.editingId = unit.id;
    this.form.patchValue({
      propertyId: unit.propertyId,
      floorId: unit.floorId ?? null,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType ?? 'APARTMENT',
      areaSqm: unit.areaSqm ?? null,
      bedrooms: unit.bedrooms ?? null,
      bathrooms: unit.bathrooms ?? null,
      rentAmount: unit.rentAmount ?? null,
      currency: unit.currency ?? 'OMR',
      notes: unit.notes ?? ''
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form.reset({ propertyId: this.selectedPropertyId, unitType: 'APARTMENT', currency: 'OMR' });
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;

    const payload = this.form.getRawValue() as UnitRequest;
    const req$ = this.editingId ? this.unitSvc.update(this.editingId, payload) : this.unitSvc.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('UNITS.SAVE_SUCCESS'));
        this.cancelForm();
        this.loadAllUnits();
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('UNITS.SAVE_ERROR'));
      }
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
    return this.propertyById[unit.propertyId]?.propertyName || `#${unit.propertyId}`;
  }

  private loadUsers(): void {
    this.userSvc.getAll(0, 500).subscribe({
      next: (res) => {
        const users = res.data?.content ?? [];
        this.userById = users.reduce((acc, u) => {
          acc[u.id] = (u.fullName || u.username || u.email || `#${u.id}`).trim();
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
        this.propertyById = this.properties.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<number, Property>);

        if (!this.properties.some((p) => p.id === this.selectedPropertyId)) {
          this.selectedPropertyId = null;
        }

        this.form.patchValue({ propertyId: this.selectedPropertyId });
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
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredUnits = this.allUnits.filter((unit) => {
      if (this.selectedPropertyId && unit.propertyId !== this.selectedPropertyId) return false;
      if (!q) return true;

      const propertyName = this.propertyName(unit).toLowerCase();
      const unitNumber = (unit.unitNumber || '').toLowerCase();
      const unitType = (unit.unitType || '').toLowerCase();
      const floor = unit.floorId != null ? String(unit.floorId) : '';

      return unitNumber.includes(q) || propertyName.includes(q) || unitType.includes(q) || floor.includes(q);
    });
  }

  private loadRenterNames(): void {
    this.tenantByUnitId = {};
    this.allUnits
      .filter((u) => u.rented)
      .forEach((u) => {
        this.tenantSvc.getByUnitId(u.id).subscribe({
          next: (tenantRes) => {
            const tenant = tenantRes.data;
            const fromUser = tenant?.userId ? this.userById[tenant.userId] : '';
            this.tenantByUnitId[u.id] = fromUser || tenant?.fullName || '—';
          },
          error: () => {
            this.tenantByUnitId[u.id] = '—';
          }
        });
      });
  }
}

