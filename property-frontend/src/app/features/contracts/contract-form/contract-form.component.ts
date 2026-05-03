import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
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

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
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
  loadingProperties = false;
  loadingUnits = false;
  loadingTenants = false;
  errorMsg = '';

  partyForm!: FormGroup;
  periodForm!: FormGroup;
  financialForm!: FormGroup;

  properties: Property[] = [];
  units: Unit[] = [];
  tenants: Tenant[] = [];

  selectedProperty: Property | null = null;
  selectedUnit: Unit | null = null;

  discountReasons = [
    { value: 'OWNER_AGREEMENT', labelAr: 'موافقة صاحب العقار', labelEn: 'Owner Agreement', label: 'CONTRACTS.DISCOUNT_OWNER_AGREEMENT' },
    { value: 'OLD_TENANT', labelAr: 'مستأجر قديم', labelEn: 'Old Tenant', label: 'CONTRACTS.DISCOUNT_OLD_TENANT' },
    { value: 'OTHER', labelAr: 'سبب آخر', labelEn: 'Other Reason', label: 'CONTRACTS.DISCOUNT_OTHER' }
  ];

  currencies = ['OMR', 'SAR', 'USD', 'AED', 'KWD', 'BHD'];
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
    @Optional() private dialogRef: MatDialogRef<ContractFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  get frequencyOptions(): LookupItem[] {
    return this.lookupCache.items('PAYMENT_FREQUENCY');
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

    this.lookupCache.preload('PAYMENT_FREQUENCY').subscribe();
    this.loadProperties();
    this.loadTenants();

    this.partyForm.get('propertyId')?.valueChanges.subscribe((propId: number | null) => {
      this.onPropertyChange(propId);
    });

    this.partyForm.get('unitId')?.valueChanges.subscribe((unitId: number | null) => {
      this.onUnitChange(unitId);
    });

    this.financialForm.get('rentDiscountReason')?.valueChanges.subscribe((reason: string | null) => {
      this.onDiscountReasonChange(reason);
    });

    if (this.data?.propertyId) {
      this.partyForm.patchValue({ propertyId: this.data.propertyId });
    }
  }

  get isDialog(): boolean {
    return !!this.dialogRef;
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
    if (!this.selectedUnit?.rentAmount) return true;
    const currentRent = this.financialForm.get('monthlyRent')?.value;
    return currentRent <= this.selectedUnit.rentAmount;
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

    this.saving = true;
    this.errorMsg = '';

    const financialData = this.financialForm.value;
    const body = {
      ...this.partyForm.value,
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
    };

    this.contractSvc.create(body).subscribe({
      next: (res) => {
        if (this.isDialog) {
          this.dialogRef.close(true);
        } else {
          this.router.navigate(['/admin/contracts', res.data?.id ?? '']);
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

  private loadProperties(): void {
    this.loadingProperties = true;
    this.propertySvc.getAll(0, 200).subscribe({
      next: (res) => {
        this.properties = (res.data?.content ?? []).filter(p => p.isActive);
        this.loadingProperties = false;
      },
      error: () => { this.loadingProperties = false; }
    });
  }

  private loadTenants(): void {
    this.loadingTenants = true;
    this.tenantSvc.getAll(0, 200).subscribe({
      next: (res) => {
        this.tenants = (res.data?.content ?? []).filter(t => t.active);
        this.loadingTenants = false;
      },
      error: () => { this.loadingTenants = false; }
    });
  }

  private toIsoDate(d: Date | null): string | null {
    if (!d) return null;
    return new Date(d).toISOString().split('T')[0];
  }
}
