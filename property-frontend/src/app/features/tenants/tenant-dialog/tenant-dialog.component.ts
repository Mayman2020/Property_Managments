import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { TenantService, TenantRequest, TenantFullOnboardRequest } from '../../../core/services/tenant.service';
import { UnitService, Unit } from '../../../core/services/unit.service';
import { ContractService } from '../../../core/services/contract.service';
import { UserService, UserManageRequest } from '../../../core/services/user.service';
import { Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { CreateContractRequest } from '../../../core/models/contract.model';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { IdentityMediaFieldsComponent } from '../../../shared/components/identity-media-fields/identity-media-fields.component';

export interface TenantDialogData {
  properties: Property[];
  defaultPropertyId?: number;
}

@Component({
  selector: 'app-tenant-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatDatepickerModule, MatProgressSpinnerModule,
    MatSelectModule, UploadZoneComponent, SearchableSelectComponent, IdentityMediaFieldsComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">groups</mat-icon>
      {{ 'TENANTS.ADD' | translate }}
    </h2>

    <mat-dialog-content class="tenant-dialog-body">
      <form [formGroup]="form" class="tenant-dialog-form">

        <!-- صورة شخصية -->
        <section class="form-section full">
          <app-identity-media-fields
            [compact]="true"
            [showCivilSection]="true"
            [(profileImageUrl)]="profileImageUrl"
            [(civilIdImageUrl)]="civilIdImageUrl">
          </app-identity-media-fields>
        </section>

        <!-- الاسم -->
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'TENANTS.FULL_NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="fullNameAr" dir="rtl" />
          <mat-error *ngIf="form.get('fullNameAr')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'TENANTS.FULL_NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="fullNameEn" dir="ltr" />
          <mat-error *ngIf="form.get('fullNameEn')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <!-- تواصل -->
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'PROFILE.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone" />
          <mat-error *ngIf="form.get('phone')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'TENANTS.NATIONAL_ID' | translate }}</mat-label>
          <input matInput formControlName="nationalId" />
          <mat-error *ngIf="form.get('nationalId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'AUTH.EMAIL' | translate }}</mat-label>
          <input matInput formControlName="email" type="email" />
          <mat-hint>{{ 'TENANTS.EMAIL_PORTAL_HINT' | translate }}</mat-hint>
          <mat-error *ngIf="form.get('email')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">{{ 'COMMON.INVALID_EMAIL' | translate }}</mat-error>
        </mat-form-field>

        <!-- تعيين الوحدة -->
        <div class="section-divider full">
          <span>{{ 'TENANTS.SCOPE' | translate }}</span>
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'TENANTS.SCOPE' | translate }}</mat-label>
          <mat-select formControlName="scope">
            <mat-option value="UNIT">{{ 'TENANTS.SCOPE_UNIT' | translate }}</mat-option>
            <mat-option value="PROPERTY">{{ 'TENANTS.SCOPE_PROPERTY' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <app-searchable-select
          formControlName="propertyId"
          [items]="data.properties"
          [label]="'REQUEST_FORM.PROPERTY'">
        </app-searchable-select>

        <app-searchable-select
          *ngIf="scope === 'UNIT'"
          class="full"
          formControlName="unitId"
          [items]="units"
          [label]="'REQUEST_FORM.UNIT'">
        </app-searchable-select>

        <!-- بيانات الوحدة المختارة -->
        <div class="unit-details-card full" *ngIf="selectedUnit">
          <div class="unit-details-header">
            <mat-icon>apartment</mat-icon>
            <span>{{ 'UNIT_DETAILS.UNIT_DETAILS' | translate }}</span>
          </div>
          <div class="unit-details-grid">
            <div class="detail-item">
              <span class="detail-label">{{ 'UNIT_DETAILS.STATUS' | translate }}</span>
              <span class="detail-value">{{ getFurnishedStatus() }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ 'UNIT_DETAILS.ORIGINAL_RENT' | translate }}</span>
              <span class="detail-value rent-value">{{ selectedUnit.rentAmount }} {{ selectedUnit.currency || 'OMR' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedUnit.areaSqm">
              <span class="detail-label">{{ 'UNIT_DETAILS.AREA' | translate }}</span>
              <span class="detail-value">{{ selectedUnit.areaSqm }} m²</span>
            </div>
          </div>
        </div>

        <!-- تفاصيل العقد -->
        <div class="section-divider full">
          <span>{{ 'CONTRACTS.NEW_CONTRACT' | translate }}</span>
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.START_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="pickerStart" formControlName="leaseStart" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerStart"></mat-datepicker-toggle>
          <mat-datepicker #pickerStart></mat-datepicker>
          <mat-error *ngIf="form.get('leaseStart')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.END_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="pickerEnd" formControlName="leaseEnd" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerEnd"></mat-datepicker-toggle>
          <mat-datepicker #pickerEnd></mat-datepicker>
          <mat-error *ngIf="form.get('leaseEnd')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.MONTHLY_RENT' | translate }}</mat-label>
          <input matInput type="number" min="0" formControlName="monthlyRent" />
          <mat-hint *ngIf="selectedUnit?.rentAmount" class="rent-hint">
            {{ 'UNIT_DETAILS.RENT_MAX_HINT' | translate }} {{ selectedUnit?.rentAmount }} {{ selectedUnit?.currency || 'OMR' }}
          </mat-hint>
          <mat-error *ngIf="form.get('monthlyRent')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
          <mat-error *ngIf="form.get('monthlyRent')?.hasError('exceedsMax')">{{ rentExceedsMaxMsg }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.PAYMENT_FREQUENCY' | translate }}</mat-label>
          <mat-select formControlName="paymentFrequency">
            <mat-option value="MONTHLY">{{ 'CONTRACTS.FREQ_MONTHLY' | translate }}</mat-option>
            <mat-option value="QUARTERLY">{{ 'CONTRACTS.FREQ_QUARTERLY' | translate }}</mat-option>
            <mat-option value="SEMI_ANNUAL">{{ 'CONTRACTS.FREQ_SEMI_ANNUAL' | translate }}</mat-option>
            <mat-option value="ANNUAL">{{ 'CONTRACTS.FREQ_ANNUAL' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.SECURITY_DEPOSIT' | translate }}</mat-label>
          <input matInput type="number" min="0" formControlName="securityDeposit" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.PAYMENT_DAY' | translate }}</mat-label>
          <input matInput type="number" min="1" max="28" formControlName="paymentDay" />
        </mat-form-field>

        <!-- شهر مجاني -->
        <mat-checkbox formControlName="hasFreeMonth" class="full checkbox-field">
          {{ 'CONTRACTS.FREE_MONTH_LABEL' | translate }}
        </mat-checkbox>

        <!-- سبب التخفيض - يظهر فقط إذا كان الإيجار أقل من الأصلي -->
        <ng-container *ngIf="showDiscountReason">
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>{{ 'CONTRACTS.DISCOUNT_REASON_LABEL' | translate }}</mat-label>
            <mat-select formControlName="rentDiscountReason">
              <mat-option [value]="null">{{ 'CONTRACTS.SELECT_REASON' | translate }}</mat-option>
              <mat-option *ngFor="let r of rentDiscountLookupItems" [value]="r.code">
                {{ lookupItemLabel(r) }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic" *ngIf="showOtherReason">
            <mat-label>{{ 'CONTRACTS.WRITE_REASON' | translate }}</mat-label>
            <textarea matInput rows="2" formControlName="otherReasonText"></textarea>
          </mat-form-field>
        </ng-container>

        <div class="full media-block">
          <app-upload-zone
            [multiple]="true"
            [accept]="'image/*,.pdf,.doc,.docx'"
            [urlList]="leaseContractUrls"
            (urlListChange)="leaseContractUrls = $event"
            [label]="'TENANTS.LEASE_CONTRACT_UPLOAD_LABEL' | translate">
          </app-upload-zone>
        </div>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'MAINTENANCE.DESCRIPTION' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" type="button" (click)="save()"
        [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .tenant-dialog-body { padding-top: 4px; }
    .tenant-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 4px; }
    .full { grid-column: 1 / -1; }
    .form-section {
      padding-bottom: 12px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
    }
    .section-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 6px 0 2px;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .section-divider::before, .section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--line);
    }
    .media-block { margin: 4px 0; }
    .dialog-actions-row { padding: 16px 24px; border-top: 1px solid var(--line); display: flex; gap: 12px; justify-content: flex-end; background: var(--surface-2); }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .unit-details-card { background: var(--surface-2, #f5f7fa); border: 1px solid var(--line, rgba(0,0,0,.1)); border-radius: 8px; padding: 10px 14px; margin: 2px 0 4px; }
    .unit-details-header { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: var(--navy-800, #1a2744); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
    .unit-details-header mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .unit-details-grid { display: flex; gap: 20px; flex-wrap: wrap; }
    .detail-item { display: flex; flex-direction: column; gap: 2px; }
    .detail-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .03em; }
    .detail-value { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .detail-value.rent-value { color: var(--navy-800, #1a2744); }
    .rent-hint { color: var(--text-muted); font-size: 0.72rem; }
    .checkbox-field { margin: 4px 0; }
    @media (max-width: 640px) { .tenant-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class TenantDialogComponent implements OnInit {
  saving = false;
  units: Unit[] = [];
  leaseContractUrls: string[] = [];
  profileImageUrl = '';
  civilIdImageUrl = '';
  selectedUnit: Unit | null = null;
  form: FormGroup;

  get rentDiscountLookupItems(): LookupItem[] {
    return [...this.lookupCache.items('RENT_DISCOUNT_REASON')]
      .filter((i) => i.active)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  lookupItemLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  get scope(): 'UNIT' | 'PROPERTY' { return this.form.get('scope')?.value ?? 'UNIT'; }

  get showDiscountReason(): boolean {
    if (!this.selectedUnit?.rentAmount) return false;
    const rent = Number(this.form.get('monthlyRent')?.value);
    return !!rent && rent < this.selectedUnit.rentAmount;
  }

  get showOtherReason(): boolean {
    return this.form.get('rentDiscountReason')?.value === 'OTHER';
  }

  get rentExceedsMaxMsg(): string {
    return this.i18n.instant('CONTRACTS.RENT_EXCEEDS_MAX');
  }

  getFurnishedStatus(): string {
    const status = this.selectedUnit?.furnishedStatus;
    if (!status) return '';
    if (status === 'FURNISHED')      return this.i18n.instant('UNIT_DETAILS.FURNISHED');
    if (status === 'UNFURNISHED')    return this.i18n.instant('UNIT_DETAILS.UNFURNISHED');
    if (status === 'SEMI_FURNISHED') return this.i18n.instant('UNIT_DETAILS.SEMI_FURNISHED');
    return status;
  }

  constructor(
    readonly ref: MatDialogRef<TenantDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: TenantDialogData,
    private readonly fb: FormBuilder,
    private readonly tenantSvc: TenantService,
    private readonly unitSvc: UnitService,
    private readonly contractSvc: ContractService,
    private readonly userSvc: UserService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly lookupCache: LookupCacheService
  ) {
    this.form = this.fb.group({
      fullNameAr:       ['', Validators.required],
      fullNameEn:       ['', Validators.required],
      phone:            ['', Validators.required],
      nationalId:       ['', Validators.required],
      email:            ['', [Validators.required, Validators.email]],
      scope:            ['UNIT', Validators.required],
      propertyId:       [data.defaultPropertyId ?? (data.properties[0]?.id ?? null)],
      unitId:           [null],
      leaseStart:       [null, Validators.required],
      leaseEnd:         [null, Validators.required],
      monthlyRent:        [null, [Validators.required, Validators.min(0)]],
      paymentFrequency:   ['MONTHLY', Validators.required],
      securityDeposit:    [null],
      paymentDay:         [1],
      hasFreeMonth:       [false],
      rentDiscountReason: [null],
      otherReasonText:    [''],
      notes:              ['']
    });
  }

  ngOnInit(): void {
    this.lookupCache.preload('RENT_DISCOUNT_REASON').pipe(catchError(() => of(undefined))).subscribe(() => {
      this.wireTenantFormSubscriptions();
    });
  }

  private wireTenantFormSubscriptions(): void {
    this.form.get('scope')?.valueChanges.subscribe(() => this.applyScopeRules());

    this.form.get('propertyId')?.valueChanges.subscribe((id) => {
      this.selectedUnit = null;
      if (id) this.loadUnits(id as number);
      else this.units = [];
    });

    this.form.get('unitId')?.valueChanges.subscribe((id: number | null) => {
      this.selectedUnit = id ? (this.units.find(u => u.id === id) ?? null) : null;
      if (this.selectedUnit?.rentAmount) {
        this.form.get('monthlyRent')?.setValue(this.selectedUnit.rentAmount, { emitEvent: false });
      }
      this.revalidateRent();
    });

    this.form.get('monthlyRent')?.valueChanges.subscribe(() => this.revalidateRent());

    this.form.get('rentDiscountReason')?.valueChanges.subscribe((v: string | null) => {
      if (v !== 'OTHER') this.form.get('otherReasonText')?.setValue('', { emitEvent: false });
    });

    this.applyScopeRules();
    const initProp = this.form.get('propertyId')?.value;
    if (initProp) this.loadUnits(initProp);
  }

  hasProfilePhoto(): boolean {
    return !!this.profileImageUrl?.trim();
  }

  private revalidateRent(): void {
    const ctrl = this.form.get('monthlyRent');
    if (!ctrl) return;
    const rent = Number(ctrl.value);
    const max  = this.selectedUnit?.rentAmount;
    if (max && rent > max) {
      ctrl.setErrors({ ...ctrl.errors, exceedsMax: true });
    } else {
      if (ctrl.hasError('exceedsMax')) {
        const { exceedsMax, ...rest } = ctrl.errors ?? {};
        ctrl.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (!this.hasProfilePhoto()) {
      this.snack.error(this.i18n.instant('COMMON.ATTACH_PROFILE_PHOTO'));
      return;
    }
    const leaseStart = this.toDateString(this.form.get('leaseStart')?.value);
    const leaseEnd   = this.toDateString(this.form.get('leaseEnd')?.value);
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

    const enteredRent = Number(this.form.get('monthlyRent')?.value);
    if (this.selectedUnit?.rentAmount && enteredRent > this.selectedUnit.rentAmount) {
      this.snack.error(this.i18n.instant('CONTRACTS.RENT_EXCEEDS_MAX'));
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();
    const nationalId = (raw.nationalId as string).trim();

    const useAtomicOnboard = !!(raw.propertyId && raw.unitId);

    if (useAtomicOnboard) {
      const onboardBody: TenantFullOnboardRequest = {
        email: raw.email,
        // Omit password so the backend applies its default initial password ("12345"),
        // matching the rest of the user-creation flows. Admins can reset later from the user screen.
        fullNameAr: raw.fullNameAr,
        fullNameEn: raw.fullNameEn,
        phone: raw.phone,
        nationalId,
        leaseStart: leaseStart!,
        leaseEnd: leaseEnd!,
        propertyId: raw.propertyId as number,
        unitId: raw.unitId as number,
        profileImageUrl: this.profileImageUrl.trim() || undefined,
        profileImage: this.profileImageUrl.trim(),
        civilIdImageUrl: this.civilIdImageUrl.trim() || undefined,
        leaseContractFiles: [...this.leaseContractUrls],
        notes: raw.notes || undefined,
        monthlyRent: Number(raw.monthlyRent),
        securityDeposit: raw.securityDeposit != null ? Number(raw.securityDeposit) : undefined,
        paymentFrequency: raw.paymentFrequency,
        paymentDay: raw.paymentDay ? Number(raw.paymentDay) : 1,
        hasFreeMonth: raw.hasFreeMonth ?? false,
        rentDiscountReason: raw.rentDiscountReason || undefined,
        otherReasonText: raw.rentDiscountReason === 'OTHER' ? (raw.otherReasonText || undefined) : undefined
      };
      this.tenantSvc.onboard(onboardBody).subscribe({
        next: () => {
          this.saving = false;
          this.snack.success(this.i18n.instant('TENANTS.SAVE_SUCCESS'));
          this.ref.close(true);
        },
        error: (err: Error) => {
          this.saving = false;
          this.snack.error(err.message || this.i18n.instant('TENANTS.SAVE_ERROR'));
        }
      });
      return;
    }

    // Legacy: property-only scope without a unit (no combined contract path on server)
    const userPayload: UserManageRequest = {
      username:        raw.email,
      email:           raw.email,
      // Omit password so backend defaults to "12345" (consistent with the rest of user creation flows).
      fullName:        raw.fullNameAr || raw.fullNameEn,
      phone:           raw.phone,
      profileImageUrl: this.profileImageUrl.trim() || undefined,
      role:            'TENANT',
      tenantLink: {
        fullNameAr: raw.fullNameAr,
        fullNameEn: raw.fullNameEn,
        nationalId,
        leaseStart,
        leaseEnd
      }
    };

    this.userSvc.create(userPayload).pipe(
      switchMap((userRes) => {
        const userId = userRes.data?.id;

        const tenantPayload: TenantRequest = {
          fullNameAr: raw.fullNameAr,
          fullNameEn: raw.fullNameEn,
          fullName:   raw.fullNameAr,
          propertyId: raw.propertyId || undefined,
          unitId:     this.scope === 'UNIT' ? (raw.unitId || undefined) : undefined,
          userId,
          phone:      raw.phone,
          email:      raw.email,
          nationalId,
          leaseStart,
          leaseEnd,
          leaseContractFiles: [...this.leaseContractUrls],
          notes:      raw.notes || undefined,
          profileImage: this.profileImageUrl.trim(),
          civilIdImageUrl: this.civilIdImageUrl.trim() || undefined
        };
        return this.tenantSvc.create(tenantPayload);
      }),
      switchMap((tenantRes) => {
        const tenant = tenantRes.data;
        if (!tenant?.id) return of(null);

        const contractPayload: CreateContractRequest = {
          tenantId:           tenant.id,
          unitId:             raw.unitId,
          propertyId:         raw.propertyId,
          startDate:          leaseStart,
          endDate:            leaseEnd,
          monthlyRent:        Number(raw.monthlyRent),
          securityDeposit:    raw.securityDeposit ? Number(raw.securityDeposit) : undefined,
          paymentFrequency:   raw.paymentFrequency,
          paymentDay:         raw.paymentDay ? Number(raw.paymentDay) : 1,
          hasFreeMonth:       raw.hasFreeMonth ?? false,
          rentDiscountReason: raw.rentDiscountReason || undefined,
          otherReasonText:    raw.rentDiscountReason === 'OTHER' ? (raw.otherReasonText || undefined) : undefined,
          notes:              raw.notes || undefined
        };
        return this.contractSvc.create(contractPayload);
      })
    ).subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('TENANTS.SAVE_SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('TENANTS.SAVE_ERROR'));
      }
    });
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

  private loadUnits(propertyId: number): void {
    this.unitSvc.getByProperty(propertyId, 0, 500).subscribe({
      next: (res) => {
        this.units = (res.data?.content ?? []).filter((u) => !u.rented && !u.reserved);
        const currentUnitId = this.form.get('unitId')?.value;
        if (currentUnitId) {
          this.selectedUnit = this.units.find((u) => u.id === currentUnitId) ?? null;
        }
      },
      error: () => this.units = []
    });
  }

  private toDateString(d: Date | string | null): string | undefined {
    if (!d) return undefined;
    if (typeof d === 'string') return d;
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
