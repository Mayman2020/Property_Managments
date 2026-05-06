import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, NgTemplateOutlet, DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { Optional, Inject } from '@angular/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContractService } from '../../../core/services/contract.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { UnitService, Unit } from '../../../core/services/unit.service';
import { TenantService, Tenant } from '../../../core/services/tenant.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { CreateContractRequest, LeaseContract } from '../../../core/models/contract.model';
import { HrEmployeeService, HrEmployeeRow } from '../../../core/services/hr-employee.service';

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [
    NgIf, NgFor, NgTemplateOutlet, DecimalPipe, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatCheckboxModule, MatStepperModule,
    MatProgressSpinnerModule, MatDialogModule,
    TranslateModule, PageHeaderComponent
  ],
  templateUrl: './contract-form.component.html',
  styleUrl: './contract-form.component.scss'
})
export class ContractFormComponent implements OnInit {
  saving = false;
  /** Dialog: hide stepper until forkJoin (lookups + lists + optional contract) finishes — avoids empty panel flash / outlet issues. */
  dialogBootstrapComplete = false;
  /** When set, submit() updates this draft instead of creating. */
  editContractId: number | null = null;
  /** Monthly rent before edits (dialog draft) — shown for PRICE_ADJUSTMENT. */
  loadedMonthlyRent: number | null = null;
  loadingProperties = false;
  loadingUnits = false;
  loadingTenants = false;
  errorMsg = '';

  partyForm!: FormGroup;
  periodForm!: FormGroup;
  financialForm!: FormGroup;
  /** Required when editing a draft from the admin dialog. */
  amendmentForm!: FormGroup;

  hrEmployees: HrEmployeeRow[] = [];

  properties: Property[] = [];
  units: Unit[] = [];
  tenants: Tenant[] = [];

  selectedProperty: Property | null = null;
  selectedUnit: Unit | null = null;

  paymentDays = Array.from({ length: 28 }, (_, i) => i + 1);

  constructor(
    private fb: FormBuilder,
    private contractSvc: ContractService,
    private propertySvc: PropertyService,
    private unitSvc: UnitService,
    private tenantSvc: TenantService,
    private router: Router,
    readonly i18n: I18nService,
    readonly lookupCache: LookupCacheService,
    private readonly hrEmployeeSvc: HrEmployeeService,
    @Optional() private dialogRef: MatDialogRef<ContractFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  get frequencyOptions(): LookupItem[] {
    return this.lookupCache.items('PAYMENT_FREQUENCY');
  }

  /** Active rows from reference data (sorted). */
  private lookupActiveSorted(type: 'CURRENCY' | 'RENT_DISCOUNT_REASON' | 'CONTRACT_DRAFT_AMEND_REASON'): LookupItem[] {
    return [...this.lookupCache.items(type)]
      .filter((i) => i.active)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  get currencyLookupItems(): LookupItem[] {
    return this.lookupActiveSorted('CURRENCY');
  }

  get rentDiscountLookupItems(): LookupItem[] {
    return this.lookupActiveSorted('RENT_DISCOUNT_REASON');
  }

  get staffAmendmentLookupItems(): LookupItem[] {
    return this.lookupActiveSorted('CONTRACT_DRAFT_AMEND_REASON');
  }

  lookupItemLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  ngOnInit(): void {
    this.partyForm = this.fb.group({
      propertyId: [null, Validators.required],
      unitId: [null, Validators.required],
      tenantId: [null, Validators.required],
      ownerId: [null],
      templateId: [null]
    });

    this.periodForm = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      signingDate: [null],
      autoRenewable: [false],
      renewalNoticeDays: [30]
    });

    this.financialForm = this.fb.group({
      monthlyRent: [null, [Validators.required, Validators.min(1)]],
      securityDeposit: [null],
      paymentFrequency: ['MONTHLY', Validators.required],
      paymentDay: [1, Validators.required],
      currency: ['OMR', Validators.required],
      notes: [''],
      hasFreeMonth: [false],
      rentDiscountReason: [null],
      otherReasonText: ['']
    });

    this.amendmentForm = this.fb.group({
      staffModificationReason: [null as string | null],
      employeeDiscountPercent: [null as number | null],
      linkedEmployeeId: [null as number | null]
    });
    this.amendmentForm.get('staffModificationReason')?.valueChanges.subscribe((reason: string | null) => {
      if (reason === 'TENANT_FREE') {
        this.financialForm.patchValue({ hasFreeMonth: true }, { emitEvent: false });
      }
      if (reason !== 'EMPLOYEE_DISCOUNT') {
        this.amendmentForm.patchValue(
          { employeeDiscountPercent: null, linkedEmployeeId: null },
          { emitEvent: false }
        );
      }
    });

    this.partyForm.get('propertyId')?.valueChanges.subscribe((propId: number | null) => {
      this.onPropertyChange(propId);
    });

    this.partyForm.get('unitId')?.valueChanges.subscribe((unitId: number | null) => {
      this.onUnitChange(unitId);
    });

    this.financialForm.get('rentDiscountReason')?.valueChanges.subscribe((reason: string | null) => {
      this.onDiscountReasonChange(reason);
    });

    const maybeEditId = this.data?.contractId != null ? Number(this.data.contractId) : NaN;
    const contract$ = !Number.isNaN(maybeEditId) && maybeEditId > 0
      ? this.contractSvc.getById(maybeEditId)
      : of(null);

    const isEditDraftDialog = !!this.dialogRef && !Number.isNaN(maybeEditId) && maybeEditId > 0;
    const employees$ = isEditDraftDialog
      ? this.hrEmployeeSvc.list(0, 300).pipe(
          catchError(() => of({ data: { content: [] as HrEmployeeRow[] } }))
        )
      : of({ data: { content: [] as HrEmployeeRow[] } });

    this.loadingProperties = true;
    this.loadingTenants = true;
    forkJoin({
      lookups: this.lookupCache
        .preload('PAYMENT_FREQUENCY', 'CURRENCY', 'RENT_DISCOUNT_REASON', 'CONTRACT_DRAFT_AMEND_REASON')
        .pipe(catchError(() => of(undefined))),
      props: this.propertySvc.getAll(0, 200),
      tenants: this.tenantSvc.getAll(0, 500),
      contract: contract$,
      employees: employees$
    }).subscribe({
      next: ({ props, tenants, contract, employees }) => {
        this.properties = (props.data?.content ?? []).filter((p) => p.isActive);
        this.loadingProperties = false;
        this.tenants = (tenants.data?.content ?? []).filter((t) => t.active);
        this.loadingTenants = false;
        this.hrEmployees = employees?.data?.content ?? [];
        const c = contract?.data as LeaseContract | undefined;
        if (!c?.id) {
          const cur = this.currencyLookupItems.find((x) => x.code === 'OMR') ?? this.currencyLookupItems[0];
          if (cur) {
            this.financialForm.patchValue({ currency: cur.code }, { emitEvent: false });
          }
        }
        if (c?.id) {
          this.editContractId = c.id;
          this.applyLoadedContract(c);
        } else if (this.data?.propertyId) {
          this.partyForm.patchValue({ propertyId: this.data.propertyId }, { emitEvent: false });
          this.onPropertyChange(this.data.propertyId);
        }
        if (this.data?.tenantId) {
          this.partyForm.patchValue({ tenantId: this.data.tenantId });
          this.partyForm.get('tenantId')?.disable();
        }
        this.dialogBootstrapComplete = true;
      },
      error: () => {
        this.loadingProperties = false;
        this.loadingTenants = false;
        this.dialogBootstrapComplete = true;
      }
    });
  }

  private applyLoadedContract(c: LeaseContract): void {
    this.loadedMonthlyRent = c.monthlyRent != null ? Number(c.monthlyRent) : null;
    this.partyForm.patchValue(
      {
        propertyId: c.propertyId,
        tenantId: c.tenantId,
        ownerId: c.ownerId ?? null,
        templateId: c.templateId ?? null
      },
      { emitEvent: false }
    );
    this.selectedProperty = this.properties.find((p) => p.id === c.propertyId) ?? null;
    this.loadingUnits = true;
    this.unitSvc.getByProperty(c.propertyId).subscribe({
      next: (res) => {
        this.units = (res.data?.content ?? []).filter((u) => u.active);
        this.loadingUnits = false;
        this.partyForm.patchValue({ unitId: c.unitId }, { emitEvent: false });
        this.selectedUnit = this.units.find((u) => u.id === c.unitId) ?? null;
      },
      error: () => {
        this.loadingUnits = false;
      }
    });
    this.periodForm.patchValue(
      {
        startDate: this.parseApiDate(c.startDate),
        endDate: this.parseApiDate(c.endDate),
        signingDate: c.signingDate ? this.parseApiDate(c.signingDate) : null,
        autoRenewable: c.autoRenewable,
        renewalNoticeDays: c.renewalNoticeDays ?? 30
      },
      { emitEvent: false }
    );
    this.financialForm.patchValue(
      {
        monthlyRent: c.monthlyRent,
        securityDeposit: c.securityDeposit ?? null,
        paymentFrequency: c.paymentFrequency,
        paymentDay: c.paymentDay,
        currency: c.currency,
        notes: c.notes ?? '',
        hasFreeMonth: !!c.hasFreeMonth,
        rentDiscountReason: c.rentDiscountReason ?? null,
        otherReasonText: c.otherReasonText ?? ''
      },
      { emitEvent: false }
    );
    if (this.isDialog && c.id) {
      this.amendmentForm.get('staffModificationReason')?.setValidators([Validators.required]);
      this.amendmentForm.get('staffModificationReason')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  private parseApiDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  }

  get isDialog(): boolean {
    return !!this.dialogRef;
  }

  get preFilledTenant(): Tenant | null {
    if (!this.data?.tenantId) return null;
    return this.tenants.find(t => t.id === this.data.tenantId) ?? null;
  }

  get propertyLabel(): string {
    if (!this.selectedProperty) return '';
    return this.i18n.currentLang === 'ar'
      ? (this.selectedProperty.propertyNameAr || this.selectedProperty.propertyName)
      : (this.selectedProperty.propertyNameEn || this.selectedProperty.propertyName);
  }

  onPropertyChange(propertyId: number | null): void {
    this.partyForm.patchValue({ unitId: null, ownerId: null }, { emitEvent: false });
    this.units = [];
    this.selectedProperty = null;
    this.selectedUnit = null;

    if (!propertyId) return;

    this.selectedProperty = this.properties.find(p => p.id === propertyId) ?? null;
    if (this.selectedProperty) {
      this.partyForm.patchValue({ ownerId: this.selectedProperty.ownerId }, { emitEvent: false });
    }

    this.loadingUnits = true;
    this.unitSvc.getByProperty(propertyId).subscribe({
      next: (res) => {
        this.units = (res.data?.content ?? []).filter(u => u.active);
        this.loadingUnits = false;
      },
      error: () => { this.loadingUnits = false; }
    });
  }

  onUnitChange(unitId: number | null): void {
    this.selectedUnit = null;
    if (!unitId) return;
    this.selectedUnit = this.units.find(u => u.id === unitId) ?? null;
    if (this.selectedUnit && this.selectedUnit.rentAmount) {
      this.financialForm.patchValue({ monthlyRent: this.selectedUnit.rentAmount }, { emitEvent: false });
    }
  }

  onDiscountReasonChange(reason: string | null): void {
    if (reason !== 'OTHER') {
      this.financialForm.patchValue({ otherReasonText: '' }, { emitEvent: false });
    }
  }

  get showOtherReason(): boolean {
    return this.financialForm.get('rentDiscountReason')?.value === 'OTHER';
  }

  validateRent(): boolean {
    if (this.staffEditBypassesUnitRentCap()) return true;
    if (!this.selectedUnit?.rentAmount) return true;
    const currentRent = this.financialForm.get('monthlyRent')?.value;
    return currentRent <= this.selectedUnit.rentAmount;
  }

  /** Admin draft dialog: allow rent below list price when reason justifies it. */
  private staffEditBypassesUnitRentCap(): boolean {
    if (!this.isDialog || !this.editContractId) return false;
    const r = this.amendmentForm.get('staffModificationReason')?.value;
    return r === 'PRICE_ADJUSTMENT' || r === 'EMPLOYEE_DISCOUNT' || r === 'TENANT_FREE';
  }

  get showStaffPriceCompare(): boolean {
    return !!(this.isDialog && this.editContractId
      && this.amendmentForm.get('staffModificationReason')?.value === 'PRICE_ADJUSTMENT'
      && this.loadedMonthlyRent != null);
  }

  get showStaffEmployeeDiscount(): boolean {
    return !!(this.isDialog && this.editContractId
      && this.amendmentForm.get('staffModificationReason')?.value === 'EMPLOYEE_DISCOUNT');
  }

  get newMonthlyRentValue(): number | null {
    const v = this.financialForm.get('monthlyRent')?.value;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  getFurnishedStatus(): string {
    if (!this.selectedUnit?.furnishedStatus) return '';
    const status = this.selectedUnit.furnishedStatus;
    if (status === 'FURNISHED') return this.i18n.instant('UNIT_DETAILS.FURNISHED');
    if (status === 'UNFURNISHED') return this.i18n.instant('UNIT_DETAILS.UNFURNISHED');
    if (status === 'SEMI_FURNISHED') return this.i18n.instant('UNIT_DETAILS.SEMI_FURNISHED');
    return status;
  }

  unitLabel(unit: Unit): string {
    return unit.unitNumber + (unit.unitType ? ` — ${unit.unitType}` : '');
  }

  tenantLabel(tenant: Tenant): string {
    return tenant.fullName + (tenant.phone ? ` (${tenant.phone})` : '');
  }

  submit(): void {
    if (this.partyForm.invalid || this.periodForm.invalid || this.financialForm.invalid) return;
    if (!this.validateRent()) {
      this.errorMsg = this.i18n.instant('CONTRACTS.RENT_EXCEEDS_MAX');
      return;
    }

    this.errorMsg = '';
    if (this.isDialog && this.editContractId) {
      const reason = this.amendmentForm.get('staffModificationReason')?.value;
      if (!reason) {
        this.errorMsg = this.i18n.instant('CONTRACTS.STAFF_MOD_REASON_REQUIRED');
        return;
      }
      if (reason === 'EMPLOYEE_DISCOUNT') {
        const pct = this.amendmentForm.get('employeeDiscountPercent')?.value;
        const emp = this.amendmentForm.get('linkedEmployeeId')?.value;
        if (pct == null || pct === '' || emp == null) {
          this.errorMsg = this.i18n.instant('CONTRACTS.STAFF_MOD_EMPLOYEE_FIELDS');
          return;
        }
        const p = Number(pct);
        if (!Number.isFinite(p) || p <= 0 || p > 100) {
          this.errorMsg = this.i18n.instant('CONTRACTS.STAFF_MOD_DISCOUNT_RANGE');
          return;
        }
      }
    }

    this.saving = true;
    this.errorMsg = '';

    const financialData = this.financialForm.value;
    const amend = this.isDialog && this.editContractId ? this.amendmentForm.getRawValue() : null;
    const body = {
      ...this.partyForm.getRawValue(),
      ...this.periodForm.value,
      monthlyRent: financialData.monthlyRent,
      securityDeposit: financialData.securityDeposit,
      paymentFrequency: financialData.paymentFrequency,
      paymentDay: financialData.paymentDay,
      currency: financialData.currency,
      notes: financialData.notes,
      hasFreeMonth: financialData.hasFreeMonth,
      rentDiscountReason: financialData.rentDiscountReason,
      otherReasonText: financialData.otherReasonText,
      startDate: this.toIsoDate(this.periodForm.value.startDate),
      endDate: this.toIsoDate(this.periodForm.value.endDate),
      signingDate: this.toIsoDate(this.periodForm.value.signingDate)
    } as CreateContractRequest;
    if (amend?.staffModificationReason) {
      body.staffModificationReason = amend.staffModificationReason;
      if (amend.staffModificationReason === 'EMPLOYEE_DISCOUNT') {
        body.employeeDiscountPercent = Number(amend.employeeDiscountPercent);
        body.linkedEmployeeId = Number(amend.linkedEmployeeId);
      }
    }

    const req$ = this.editContractId != null
      ? this.contractSvc.update(this.editContractId, body)
      : this.contractSvc.create(body);

    req$.subscribe({
      next: (res) => {
        this.saving = false;
        if (this.isDialog) {
          this.dialogRef.close(true);
        } else {
          const id = this.editContractId ?? res.data?.id;
          this.router.navigate(['/admin/contracts', id ?? '']);
        }
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'Error saving contract';
        this.saving = false;
      }
    });
  }

  cancel(): void {
    if (this.isDialog) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/admin/contracts/list']);
    }
  }

  private toIsoDate(d: Date | null): string | null {
    if (!d) return null;
    return new Date(d).toISOString().split('T')[0];
  }
}
