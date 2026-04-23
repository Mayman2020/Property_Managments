import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Property, PropertyService } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { Tenant, TenantRequest, TenantService } from '../../core/services/tenant.service';
import { Unit, UnitService } from '../../core/services/unit.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, ReactiveFormsModule, TranslateModule, MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageHeaderComponent, UploadZoneComponent, EmptyStateComponent],
  templateUrl: './tenant-management.component.html',
  styleUrl: './tenant-management.component.scss'
})
export class TenantManagementComponent implements OnInit {
  loading = true;
  saving = false;
  showCreateForm = false;

  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  properties: Property[] = [];
  units: Unit[] = [];
  allUnits: Unit[] = [];
  propertyById: Record<number, Property> = {};
  unitById: Record<number, Unit> = {};
  tenantUsers: User[] = [];
  searchTerm = '';
  leaseContractUrls: string[] = [];

  scope: 'UNIT' | 'PROPERTY' = 'UNIT';
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly tenantSvc: TenantService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly userSvc: UserService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      scope: ['UNIT', Validators.required],
      propertyId: [null],
      unitId: [null],
      userId: [null],
      phone: ['', Validators.required],
      email: [''],
      nationalId: [''],
      leaseStart: [null, Validators.required],
      leaseEnd: [null, Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.form.get('scope')?.valueChanges.subscribe((v) => {
      this.scope = v as 'UNIT' | 'PROPERTY';
      this.applyScopeRules();
    });

    this.form.get('propertyId')?.valueChanges.subscribe((id) => {
      if (id) this.loadUnitsByProperty(id as number);
      else this.units = [];
    });

    this.form.get('userId')?.valueChanges.subscribe((id) => {
      const user = this.tenantUsers.find((u) => u.id === id);
      if (!user) return;

      if (!this.form.get('fullName')?.value) {
        this.form.patchValue({ fullName: user.fullName || '' }, { emitEvent: false });
      }
      if (!this.form.get('phone')?.value) {
        this.form.patchValue({ phone: '' }, { emitEvent: false });
      }
      if (!this.form.get('email')?.value) {
        this.form.patchValue({ email: user.email || '' }, { emitEvent: false });
      }
    });

    this.applyScopeRules();
    this.loadData();
  }

  onLeaseContractsUploaded(urls: string[]): void {
    this.leaseContractUrls = urls;
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const leaseStart = this.toDateString(this.form.get('leaseStart')?.value);
    const leaseEnd = this.toDateString(this.form.get('leaseEnd')?.value);
    if (!leaseStart || !leaseEnd) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_REQUIRED'));
      return;
    }
    if (leaseEnd < leaseStart) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_INVALID'));
      return;
    }
    if (this.leaseContractUrls.length === 0) {
      this.snack.error(this.i18n.instant('TENANTS.CONTRACT_REQUIRED'));
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();
    const payload: TenantRequest = {
      fullName: raw.fullName,
      propertyId: raw.propertyId || undefined,
      unitId: this.scope === 'UNIT' ? (raw.unitId || undefined) : undefined,
      userId: raw.userId || undefined,
      phone: raw.phone,
      email: raw.email || undefined,
      nationalId: raw.nationalId || undefined,
      leaseStart,
      leaseEnd,
      leaseContractFiles: [...this.leaseContractUrls],
      notes: raw.notes || undefined
    };

    this.tenantSvc.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('TENANTS.SAVE_SUCCESS'));
        this.form.reset({ scope: this.scope, propertyId: this.form.get('propertyId')?.value ?? null });
        this.leaseContractUrls = [];
        this.applyScopeRules();
        this.loadTenants();
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('TENANTS.SAVE_ERROR'));
      }
    });
  }

  remove(t: Tenant): void {
    this.tenantSvc.delete(t.id).subscribe({
      next: () => {
        this.snack.success(this.i18n.instant('TENANTS.DELETE_SUCCESS'));
        this.loadTenants();
      },
      error: (err: Error) => this.snack.error(err.message || this.i18n.instant('TENANTS.SAVE_ERROR'))
    });
  }

  userLabel(user: User): string {
    return `${user.fullName} (${user.email})`;
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.loadTenants();
  }

  propertyLabel(id?: number): string {
    if (!id) return '—';
    return this.propertyById[id]?.propertyName || `#${id}`;
  }

  unitLabel(id?: number): string {
    if (!id) return '—';
    return this.unitById[id]?.unitNumber || `#${id}`;
  }

  private toDateString(d: Date | string | null): string | undefined {
    if (!d) return undefined;
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private applyScopeRules(): void {
    const unitCtrl = this.form.get('unitId');
    if (!unitCtrl) return;

    if (this.scope === 'UNIT') {
      unitCtrl.setValidators([Validators.required]);
    } else {
      unitCtrl.clearValidators();
      unitCtrl.setValue(null, { emitEvent: false });
    }
    unitCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private loadData(): void {
    this.loading = true;

    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => {
        this.properties = res.data?.content ?? [];
        this.propertyById = this.properties.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<number, Property>);
        if (this.properties.length > 0 && !this.form.get('propertyId')?.value) {
          this.form.patchValue({ propertyId: this.properties[0].id });
        }
        this.loadAllUnits();
      }
    });

    this.userSvc.getAll(0, 500).subscribe({
      next: (res) => {
        const all = res.data?.content ?? [];
        this.tenantUsers = all.filter((u) => u.role === 'TENANT' && u.isActive);
      },
      error: () => {
        this.tenantUsers = [];
      }
    });

    this.loadTenants();
  }

  private loadTenants(): void {
    this.tenantSvc.getAll(0, 200, this.searchTerm).subscribe({
      next: (res) => {
        this.tenants = res.data?.content ?? [];
        this.filteredTenants = [...this.tenants];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('TENANTS.LOAD_ERROR'));
      }
    });
  }

  private loadUnitsByProperty(propertyId: number): void {
    this.unitSvc.getByProperty(propertyId, 0, 500).subscribe({
      next: (res) => this.units = res.data?.content ?? [],
      error: () => this.units = []
    });
  }

  private loadAllUnits(): void {
    if (this.properties.length === 0) {
      this.allUnits = [];
      this.unitById = {};
      return;
    }

    const requests = this.properties.map((property) =>
      this.unitSvc.getByProperty(property.id, 0, 500).pipe(
        map((res) => res.data?.content ?? []),
        catchError(() => of([] as Unit[]))
      )
    );

    forkJoin(requests).subscribe({
      next: (chunks) => {
        this.allUnits = chunks.flat();
        this.unitById = this.allUnits.reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {} as Record<number, Unit>);
      }
    });
  }

}
