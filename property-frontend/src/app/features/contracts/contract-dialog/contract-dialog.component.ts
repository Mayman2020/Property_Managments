import { Component, Inject, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

import { ContractService } from '../../../core/services/contract.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { UnitService, Unit } from '../../../core/services/unit.service';
import { TenantService, Tenant } from '../../../core/services/tenant.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

export interface ContractDialogData {
  /** Pre-fill a specific tenant (from tenant list "Assign Unit" button). */
  tenantId?: number;
  tenantName?: string;
  /** Open dialog with a pre-selected property and unit for assignment. */
  propertyId?: number;
  unitId?: number;
}

@Component({
  selector: 'app-contract-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatCheckboxModule,
    MatFormFieldModule, MatIconModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatSelectModule,
    SearchableSelectComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">description</mat-icon>
      {{ 'CONTRACTS.NEW_CONTRACT' | translate }}
    </h2>

    <mat-dialog-content class="contract-dialog-body">

      <div class="loading-overlay" *ngIf="loadingInit">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <form *ngIf="!loadingInit" [formGroup]="form" class="contract-dialog-form">

        <!-- ── Tenant ── -->
        <div class="section-divider full">
          <span>{{ 'CONTRACTS.STEP_PARTIES' | translate }}</span>
        </div>

        <!-- Pre-filled tenant chip -->
        <div class="info-chip full" *ngIf="data?.tenantId">
          <mat-icon>person</mat-icon>
          <div class="chip-text">
            <span class="chip-name">{{ data.tenantName }}</span>
            <span class="chip-meta">{{ 'CONTRACTS.TENANT' | translate }}</span>
          </div>
        </div>

        <!-- Tenant selector (when not pre-filled) -->
        <mat-form-field *ngIf="!data?.tenantId" appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.TENANT' | translate }}</mat-label>
          <mat-select formControlName="tenantId">
            <mat-option [value]="null" disabled>
              {{ loadingTenants ? ('COMMON.LOADING' | translate) : ('TENANTS.SELECT_USER' | translate) }}
            </mat-option>
            <mat-option *ngFor="let t of tenants" [value]="t.id">
              {{ t.fullName }}
              <span *ngIf="t.phone" style="font-size:0.8em;color:#888"> · {{ t.phone }}</span>
            </mat-option>
          </mat-select>
          <mat-error>{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <!-- Property selector -->
        <app-searchable-select
          formControlName="propertyId"
          [items]="properties"
          [label]="'REQUEST_FORM.PROPERTY'">
        </app-searchable-select>

        <!-- Unit selector -->
        <app-searchable-select
          formControlName="unitId"
          [items]="units"
          [label]="'REQUEST_FORM.UNIT'">
        </app-searchable-select>

        <!-- Unit details card -->
        <div class="unit-details-card full" *ngIf="selectedUnit">
          <div class="unit-details-header">
            <mat-icon>apartment</mat-icon>
            <span>{{ 'UNIT_DETAILS.UNIT_DETAILS' | translate }}</span>
          </div>
          <div class="unit-details-grid">
            <div class="detail-item" *ngIf="selectedUnit.furnishedStatus">
              <span class="detail-label">{{ 'UNIT_DETAILS.STATUS' | translate }}</span>
              <span class="detail-value">{{ getFurnishedStatus() }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedUnit.rentAmount">
              <span class="detail-label">{{ 'UNIT_DETAILS.ORIGINAL_RENT' | translate }}</span>
              <span class="detail-value rent-value">{{ selectedUnit.rentAmount }} {{ selectedUnit.currency || 'SAR' }}</span>
            </div>
            <div class="detail-item" *ngIf="selectedUnit.areaSqm">
              <span class="detail-label">{{ 'UNIT_DETAILS.AREA' | translate }}</span>
              <span class="detail-value">{{ selectedUnit.areaSqm }} m²</span>
            </div>
          </div>
        </div>

        <!-- ── Contract Period ── -->
        <div class="section-divider full">
          <span>{{ 'CONTRACTS.STEP_PERIOD' | translate }}</span>
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.START_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="pickerStart" formControlName="startDate" placeholder="DD/MM/YYYY" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerStart"></mat-datepicker-toggle>
          <mat-datepicker #pickerStart></mat-datepicker>
          <mat-error *ngIf="form.get('startDate')?.hasError('matDatepickerParse')">{{ 'CONTRACTS.INVALID_DATE_FORMAT' | translate }}</mat-error>
          <mat-error *ngIf="form.get('startDate')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.END_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="pickerEnd" formControlName="endDate" placeholder="DD/MM/YYYY" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerEnd"></mat-datepicker-toggle>
          <mat-datepicker #pickerEnd></mat-datepicker>
          <mat-error *ngIf="form.get('endDate')?.hasError('matDatepickerParse')">{{ 'CONTRACTS.INVALID_DATE_FORMAT' | translate }}</mat-error>
          <mat-error *ngIf="form.get('endDate')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <!-- ── Financial ── -->
        <div class="section-divider full">
          <span>{{ 'CONTRACTS.STEP_FINANCIAL' | translate }}</span>
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.MONTHLY_RENT' | translate }}</mat-label>
          <input matInput type="number" min="0" formControlName="monthlyRent" />
          <mat-hint *ngIf="selectedUnit?.rentAmount" class="rent-hint">
            {{ 'UNIT_DETAILS.RENT_MAX_HINT' | translate }} {{ selectedUnit?.rentAmount }} {{ selectedUnit?.currency || 'SAR' }}
          </mat-hint>
          <mat-error *ngIf="form.get('monthlyRent')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
          <mat-error *ngIf="form.get('monthlyRent')?.hasError('exceedsMax')">{{ 'CONTRACTS.RENT_EXCEEDS_MAX' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.PAYMENT_FREQUENCY' | translate }}</mat-label>
          <mat-select formControlName="paymentFrequency">
            <mat-option *ngFor="let f of paymentFrequencyLookupItems" [value]="f.code">{{ lookupItemLabel(f) }}</mat-option>
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

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.CURRENCY' | translate }}</mat-label>
          <mat-select formControlName="currency">
            <mat-option *ngFor="let c of currencyLookupItems" [value]="c.code">{{ lookupItemLabel(c) }}</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Free month -->
        <mat-checkbox formControlName="hasFreeMonth" class="full checkbox-field">
          {{ 'CONTRACTS.FREE_MONTH_LABEL' | translate }}
        </mat-checkbox>

        <!-- Discount reason (shows when rent < unit base rent) -->
        <ng-container *ngIf="showDiscountReason">
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>{{ 'CONTRACTS.DISCOUNT_REASON_LABEL' | translate }}</mat-label>
            <mat-select formControlName="rentDiscountReason">
              <mat-option [value]="null">{{ 'CONTRACTS.SELECT_REASON' | translate }}</mat-option>
              <mat-option *ngFor="let r of rentDiscountLookupItems" [value]="r.code">{{ lookupItemLabel(r) }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic" *ngIf="showOtherReason">
            <mat-label>{{ 'CONTRACTS.WRITE_REASON' | translate }}</mat-label>
            <textarea matInput rows="2" formControlName="otherReasonText"></textarea>
          </mat-form-field>
        </ng-container>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'CONTRACTS.NOTES' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>

        <div class="error-banner full" *ngIf="errorMsg">
          <mat-icon>error_outline</mat-icon>
          {{ errorMsg }}
        </div>

      </form>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" type="button" (click)="save()" [disabled]="saving || loadingInit">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'CONTRACTS.SAVE_DRAFT' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 10px; }
    .dialog-title-icon { color: var(--navy-800, #1a2744); }

    .contract-dialog-body { padding-top: 4px; min-width: 560px; }
    .loading-overlay { display: flex; justify-content: center; padding: 48px 0; }

    .contract-dialog-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding-top: 6px;
    }
    .full { grid-column: 1 / -1; }

    .section-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 8px 0 2px;
      font-size: 0.75rem; font-weight: 700;
      color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em;
    }
    .section-divider::before, .section-divider::after {
      content: ''; flex: 1; height: 1px; background: var(--line);
    }

    /* Tenant chip */
    .info-chip {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: 12px;
      border: 1px solid var(--line); background: var(--surface-2);
    }
    .info-chip mat-icon { color: var(--navy-700); flex-shrink: 0; }
    .chip-text { display: flex; flex-direction: column; gap: 2px; }
    .chip-name { font-weight: 700; font-size: 0.95rem; color: var(--text-main); }
    .chip-meta { font-size: 0.75rem; color: var(--text-muted); }

    /* Unit card */
    .unit-details-card {
      background: var(--surface-2); border: 1px solid var(--line);
      border-radius: 10px; padding: 12px 16px; margin: 2px 0;
    }
    .unit-details-header {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.73rem; font-weight: 700; color: var(--navy-800);
      text-transform: uppercase; letter-spacing: .04em; margin-bottom: 10px;
    }
    .unit-details-header mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .unit-details-grid { display: flex; gap: 24px; flex-wrap: wrap; }
    .detail-item { display: flex; flex-direction: column; gap: 3px; }
    .detail-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .03em; }
    .detail-value { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
    .detail-value.rent-value { color: var(--navy-800); }
    .rent-hint { font-size: 0.72rem; color: var(--text-muted); }

    .checkbox-field { margin: 2px 0; }

    /* Error banner */
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 8px;
      background: var(--bad-bg); color: var(--bad);
      font-size: 0.85rem; font-weight: 600;
    }
    .error-banner mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    /* Actions */
    .dialog-actions-row {
      padding: 14px 20px;
      border-top: 1px solid var(--line);
      display: flex; gap: 10px; justify-content: flex-end;
      background: var(--surface-2);
    }
    .navy-btn { background: var(--navy-800) !important; color: #fff !important; }

    @media (max-width: 600px) {
      .contract-dialog-body { min-width: 0; }
      .contract-dialog-form { grid-template-columns: 1fr; }
    }
  `]
})
export class ContractDialogComponent implements OnInit {
  form: FormGroup;
  saving = false;
  loadingInit = true;
  loadingTenants = false;
  errorMsg = '';

  properties: Property[] = [];
  units: Unit[] = [];
  tenants: Tenant[] = [];
  selectedUnit: Unit | null = null;

  get paymentFrequencyLookupItems(): LookupItem[] {
    return this.lookupRowsSorted('PAYMENT_FREQUENCY');
  }

  get currencyLookupItems(): LookupItem[] {
    return this.lookupRowsSorted('CURRENCY');
  }

  get rentDiscountLookupItems(): LookupItem[] {
    return this.lookupRowsSorted('RENT_DISCOUNT_REASON');
  }

  lookupItemLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  private lookupRowsSorted(type: 'PAYMENT_FREQUENCY' | 'CURRENCY' | 'RENT_DISCOUNT_REASON'): LookupItem[] {
    return [...this.lookupCache.items(type)]
      .filter((i) => i.active)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  get showDiscountReason(): boolean {
    if (!this.selectedUnit?.rentAmount) return false;
    const rent = Number(this.form.get('monthlyRent')?.value);
    return !!rent && rent < this.selectedUnit.rentAmount;
  }

  get showOtherReason(): boolean {
    return this.form.get('rentDiscountReason')?.value === 'OTHER';
  }

  getFurnishedStatus(): string {
    const s = this.selectedUnit?.furnishedStatus;
    if (!s) return '';
    if (s === 'FURNISHED')      return this.i18n.instant('UNIT_DETAILS.FURNISHED');
    if (s === 'UNFURNISHED')    return this.i18n.instant('UNIT_DETAILS.UNFURNISHED');
    if (s === 'SEMI_FURNISHED') return this.i18n.instant('UNIT_DETAILS.SEMI_FURNISHED');
    return s;
  }

  constructor(
    readonly ref: MatDialogRef<ContractDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ContractDialogData,
    private readonly fb: FormBuilder,
    private readonly contractSvc: ContractService,
    private readonly propertySvc: PropertyService,
    private readonly unitSvc: UnitService,
    private readonly tenantSvc: TenantService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly lookupCache: LookupCacheService
  ) {
    this.form = this.fb.group({
      tenantId:           [data?.tenantId ?? null, Validators.required],
      propertyId:         [null, Validators.required],
      unitId:             [null, Validators.required],
      startDate:          [null, Validators.required],
      endDate:            [null, Validators.required],
      monthlyRent:        [null, [Validators.required, Validators.min(0)]],
      paymentFrequency:   ['MONTHLY', Validators.required],
      securityDeposit:    [null],
      paymentDay:         [1],
      currency:           ['SAR', Validators.required],
      hasFreeMonth:       [false],
      rentDiscountReason: [null],
      otherReasonText:    [''],
      notes:              ['']
    });

    if (data?.tenantId) {
      this.form.get('tenantId')?.disable();
    }
  }

  ngOnInit(): void {
    this.form.get('propertyId')?.valueChanges.subscribe((id: number | null) => {
      this.units = [];
      this.selectedUnit = null;
      this.form.get('unitId')?.setValue(null, { emitEvent: false });
      if (id) this.loadUnits(id);
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

    this.loadingTenants = true;
    this.lookupCache
      .preload('PAYMENT_FREQUENCY', 'CURRENCY', 'RENT_DISCOUNT_REASON')
      .pipe(catchError(() => of(undefined)))
      .subscribe({
        next: () => {
          const pf = this.paymentFrequencyLookupItems[0]?.code ?? 'MONTHLY';
          const cur = this.currencyLookupItems.find((c) => c.code === 'SAR') ?? this.currencyLookupItems[0];
          const values: any = { paymentFrequency: pf, currency: cur?.code ?? 'SAR' };
          if (this.data?.propertyId) {
            values.propertyId = this.data.propertyId;
          }
          this.form.patchValue(values, { emitEvent: true });
          Promise.all([
            this.propertySvc.getAll(0, 200).toPromise(),
            this.tenantSvc.getAll(0, 500).toPromise()
          ]).then(([propRes, tenRes]) => {
            this.properties = (propRes?.data?.content ?? []).filter((p: Property) => p.isActive);
            this.tenants = (tenRes?.data?.content ?? []).filter((t: Tenant) => t.active);
            this.loadingTenants = false;
            this.loadingInit = false;
          }).catch(() => {
            this.loadingInit = false;
            this.loadingTenants = false;
          });
        },
        error: () => {
          this.loadingInit = false;
          this.loadingTenants = false;
        }
      });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      setTimeout(() => {
        const content = document.querySelector('mat-dialog-content');
        if (content) content.scrollTop = 0;
      }, 50);
      return;
    }
    const raw = this.form.getRawValue();

    const startDate = this.toIsoDate(raw.startDate);
    const endDate   = this.toIsoDate(raw.endDate);

    if (!startDate || !endDate) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_REQUIRED'));
      return;
    }
    if (endDate < startDate) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_INVALID'));
      return;
    }

    const rent = Number(raw.monthlyRent);
    if (this.selectedUnit?.rentAmount && rent > this.selectedUnit.rentAmount) {
      this.snack.error(this.i18n.instant('CONTRACTS.RENT_EXCEEDS_MAX'));
      return;
    }

    this.saving = true;
    this.errorMsg = '';

    const payload = {
      tenantId:           raw.tenantId,
      propertyId:         raw.propertyId,
      unitId:             raw.unitId,
      startDate,
      endDate,
      monthlyRent:        rent,
      securityDeposit:    raw.securityDeposit ? Number(raw.securityDeposit) : undefined,
      paymentFrequency:   raw.paymentFrequency,
      paymentDay:         raw.paymentDay ? Number(raw.paymentDay) : 1,
      currency:           raw.currency,
      hasFreeMonth:       raw.hasFreeMonth ?? false,
      rentDiscountReason: raw.rentDiscountReason || undefined,
      otherReasonText:    raw.rentDiscountReason === 'OTHER' ? (raw.otherReasonText || undefined) : undefined,
      notes:              raw.notes || undefined
    };

    this.contractSvc.create(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.snack.success(this.i18n.instant('CONTRACTS.SAVE_DRAFT'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.errorMsg = err.message || this.i18n.instant('USER_MGMT.SAVE_ERROR');
      }
    });
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

  private loadUnits(propertyId: number): void {
    const pageContracts = (res: any): any[] => {
      const d = res?.data;
      if (!d) return [];
      return Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : [];
    };
    const sameProperty = (c: any) => Number(c.propertyId) === propertyId;

    forkJoin({
      units: this.unitSvc.getByProperty(propertyId, 0, 500).pipe(catchError(() => of(null))),
      active: this.contractSvc.getAll({ status: 'ACTIVE', size: 500 }).pipe(catchError(() => of(null))),
      draft: this.contractSvc.getAll({ status: 'DRAFT', size: 500 }).pipe(catchError(() => of(null))),
      suspended: this.contractSvc.getAll({ status: 'SUSPENDED', size: 500 }).pipe(catchError(() => of(null)))
    }).subscribe(({ units, active, draft, suspended }) => {
      const busyUnitIds = new Set<number>();
      for (const c of [...pageContracts(active), ...pageContracts(draft), ...pageContracts(suspended)]) {
        if (sameProperty(c) && c.unitId != null) {
          busyUnitIds.add(Number(c.unitId));
        }
      }
      this.units = (units?.data?.content ?? []).filter(
        (u: Unit) => u.active && !u.rented && !busyUnitIds.has(u.id)
      );
      if (this.data?.unitId && this.units.some((u) => u.id === this.data.unitId)) {
        this.form.get('unitId')?.setValue(this.data.unitId, { emitEvent: true });
      }
    });
  }

  private toIsoDate(d: Date | string | null): string | null {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

