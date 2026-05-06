import { Component, Inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';

import { Unit, UnitRequest, UnitService } from '../../core/services/unit.service';
import { Tenant, TenantService } from '../../core/services/tenant.service';
import { LeaseContract } from '../../core/models/contract.model';
import { Property } from '../../core/services/property.service';
import { FloorItem, FloorService } from '../../core/services/floor.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../core/services/lookup.service';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { AuditTrailComponent } from '../../shared/components/audit-trail/audit-trail.component';

export interface UnitDialogData {
  properties: Property[];
  unit: Unit | null;
  defaultPropertyId?: number;
  /** Read-only details (same layout as edit, no save). */
  readOnly?: boolean;
  /** Active / draft lease row for this unit (from list cache) — summary in view mode. */
  leaseContract?: LeaseContract | null;
}

@Component({
  selector: 'app-unit-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatRadioModule,
    SearchableSelectComponent,
    AuditTrailComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">door_front</mat-icon>
      {{ dialogTitleKey | translate }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="unit-dialog-form">
        <app-searchable-select
          class="full"
          formControlName="propertyId"
          [items]="data.properties"
          [label]="'REQUEST_FORM.PROPERTY'"
          [required]="true">
        </app-searchable-select>

        <app-searchable-select
          formControlName="unitType"
          [items]="unitTypes"
          [label]="'UNITS.UNIT_TYPE'"
          [bindValue]="'code'"
          [required]="true">
        </app-searchable-select>

        <div class="radio-group-field full">
          <label class="radio-group-label">{{ 'UNITS.FURNISHED_STATUS' | translate }} <span class="required-star">*</span></label>
          <mat-radio-group formControlName="furnishedStatus" class="radio-group">
            <mat-radio-button *ngFor="let item of furnishedStatuses" [value]="item.code">
              {{ isAr ? item.nameAr : item.nameEn }}
            </mat-radio-button>
          </mat-radio-group>
          <mat-error *ngIf="form.get('furnishedStatus')?.invalid && form.get('furnishedStatus')?.touched">
            {{ 'COMMON.REQUIRED' | translate }}
          </mat-error>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.FLOOR' | translate }}</mat-label>
          <mat-select formControlName="floorId">
            <mat-option *ngFor="let floor of floors" [value]="floor.id">
              {{ 'PROPERTY_FORM.FLOOR' | translate }} {{ floor.floorNumber }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.AREA' | translate }}</mat-label>
          <input matInput type="number" formControlName="areaSqm" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'UNITS.RENT' | translate }}</mat-label>
          <input matInput type="number" formControlName="rentAmount" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'MAINTENANCE.DESCRIPTION' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>
      </form>

      <section *ngIf="data.readOnly && data.unit" class="tenant-lease-panel full">
        <div class="panel-eyebrow">{{ 'UNITS.TENANT_OCCUPANCY' | translate }}</div>
        <div *ngIf="loadingTenant" class="tenant-loading">
          <mat-spinner diameter="36"></mat-spinner>
        </div>
        <ng-container *ngIf="!loadingTenant">
          <div *ngIf="tenantDetail" class="detail-grid">
            <div class="d-cell full-span">
              <span class="d-label">{{ 'TENANTS.FULL_NAME' | translate }}</span>
              <span class="d-val">{{ tenantDetail.fullName.trim() || '—' }}</span>
            </div>
            <div class="d-cell">
              <span class="d-label">{{ 'TENANTS.FULL_NAME_AR' | translate }}</span>
              <span class="d-val">{{ tenantDetail.fullNameAr?.trim() || '—' }}</span>
            </div>
            <div class="d-cell">
              <span class="d-label">{{ 'TENANTS.FULL_NAME_EN' | translate }}</span>
              <span class="d-val">{{ tenantDetail.fullNameEn?.trim() || '—' }}</span>
            </div>
            <div class="d-cell">
              <span class="d-label">{{ 'TENANTS.NATIONAL_ID' | translate }}</span>
              <span class="d-val mono">{{ tenantDetail.nationalId?.trim() || '—' }}</span>
            </div>
            <div class="d-cell">
              <span class="d-label">{{ 'PROFILE.PHONE' | translate }}</span>
              <span class="d-val mono">{{ tenantDetail.phone.trim() || '—' }}</span>
            </div>
            <div class="d-cell full-span">
              <span class="d-label">{{ 'AUTH.EMAIL' | translate }}</span>
              <span class="d-val mono">{{ tenantDetail.email?.trim() || '—' }}</span>
            </div>
            <div class="d-cell">
              <span class="d-label">{{ 'TENANTS.LEASE_START' | translate }}</span>
              <span class="d-val">{{ tenantDetail.leaseStart ? (tenantDetail.leaseStart | date:'dd/MM/yyyy') : '—' }}</span>
            </div>
            <div class="d-cell">
              <span class="d-label">{{ 'TENANTS.LEASE_END' | translate }}</span>
              <span class="d-val">{{ tenantDetail.leaseEnd ? (tenantDetail.leaseEnd | date:'dd/MM/yyyy') : '—' }}</span>
            </div>
            <div class="d-cell full-span" *ngIf="tenantDetail.notes?.trim()">
              <span class="d-label">{{ 'TENANTS.NOTES' | translate }}</span>
              <span class="d-val notes">{{ tenantDetail.notes }}</span>
            </div>
          </div>
          <p *ngIf="!tenantDetail && !(data.leaseContract?.tenantName)" class="muted-hint">{{ 'UNITS.NO_TENANT_PROFILE' | translate }}</p>
        </ng-container>

        <div *ngIf="data.leaseContract as lc" class="lease-snapshot">
          <div class="panel-eyebrow sub">{{ 'UNITS.LEASE_SNAPSHOT' | translate }}</div>
          <div class="detail-grid compact">
            <div class="d-cell"><span class="d-label">{{ 'CONTRACTS.CONTRACT_NUMBER' | translate }}</span><span class="d-val mono">{{ lc.contractNumber }}</span></div>
            <div class="d-cell"><span class="d-label">{{ 'REQUEST_LIST.TENANT' | translate }}</span><span class="d-val">{{ lc.tenantName?.trim() || '—' }}</span></div>
            <div class="d-cell"><span class="d-label">{{ 'CONTRACTS.STATUS' | translate }}</span><span class="d-val">{{ ('CONTRACTS.STATUS_' + lc.status) | translate }}</span></div>
            <div class="d-cell"><span class="d-label">{{ 'CONTRACTS.MONTHLY_RENT' | translate }}</span><span class="d-val">{{ lc.monthlyRent | number }} {{ lc.currency }}</span></div>
            <div class="d-cell"><span class="d-label">{{ 'CONTRACTS.START_DATE' | translate }}</span><span class="d-val">{{ lc.startDate | date:'dd/MM/yyyy' }}</span></div>
            <div class="d-cell"><span class="d-label">{{ 'CONTRACTS.END_DATE' | translate }}</span><span class="d-val">{{ lc.endDate | date:'dd/MM/yyyy' }}</span></div>
          </div>
          <button mat-stroked-button type="button" class="open-contract-btn" *ngIf="lc.id" (click)="openContract(lc.id)">
            <mat-icon>open_in_new</mat-icon>
            {{ 'UNITS.OPEN_CONTRACT' | translate }}
          </button>
        </div>
      </section>

      <app-audit-trail *ngIf="data.unit" class="full unit-audit"
        [createdAt]="data.unit.createdAt"
        [updatedAt]="data.unit.updatedAt"
        [createdBy]="data.unit.createdBy"
        [createdByName]="data.unit.createdByName"
        [modifiedBy]="data.unit.modifiedBy"
        [modifiedByName]="data.unit.modifiedByName">
      </app-audit-trail>
    </mat-dialog-content>
    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">
        {{ (data.readOnly ? 'ACTIONS.CLOSE' : 'ACTIONS.CANCEL') | translate }}
      </button>
      <button mat-flat-button class="navy-btn" type="button" *ngIf="!data.readOnly" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .unit-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-top: 10px; }
    .full { grid-column: 1 / -1; }
    .dialog-actions-row { padding: 16px 24px; border-top: 1px solid var(--line); display: flex; gap: 12px; justify-content: flex-end; background: var(--surface-2); }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .radio-group-field { display: flex; flex-direction: column; gap: 6px; }
    .radio-group-label { font-size: 13px; color: var(--text-secondary, #666); }
    .required-star { color: red; margin-inline-start: 2px; }
    .radio-group { display: flex; flex-direction: row; gap: 24px; flex-wrap: wrap; }
    mat-error { font-size: 12px; color: #f44336; }
    @media (max-width: 620px) { .unit-dialog-form { grid-template-columns: 1fr; } }
    .unit-audit { grid-column: 1 / -1; margin-top: 8px; }
    .tenant-lease-panel { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--line, rgba(0,0,0,.1)); }
    .panel-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.75; margin-bottom: 10px; }
    .panel-eyebrow.sub { margin-top: 14px; }
    .tenant-loading { display: flex; justify-content: center; padding: 16px 0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
    .detail-grid.compact { margin-bottom: 10px; }
    .d-cell { display: flex; flex-direction: column; gap: 2px; }
    .d-cell.full-span { grid-column: 1 / -1; }
    .d-label { font-size: 11px; font-weight: 600; opacity: 0.65; }
    .d-val { font-size: 0.95rem; word-break: break-word; }
    .d-val.mono { font-family: var(--font-mono, monospace); }
    .d-val.notes { white-space: pre-wrap; }
    .muted-hint { font-size: 0.88rem; color: var(--text-muted); margin: 0 0 8px; }
    .lease-snapshot { margin-top: 6px; }
    .open-contract-btn { margin-top: 8px; }
  `]
})
export class UnitDialogComponent implements OnInit {
  saving = false;
  tenantDetail: Tenant | null = null;
  loadingTenant = false;
  unitTypes: LookupItem[] = [];
  furnishedStatuses: LookupItem[] = [];
  floors: FloorItem[] = [];

  get dialogTitleKey(): string {
    if (this.data.readOnly && this.data.unit) return 'UNITS.VIEW_DETAILS';
    return this.data.unit ? 'UNITS.EDIT' : 'UNITS.ADD';
  }

  get isAr(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  private loadFloors(propertyId: number): void {
    this.floorSvc.getByProperty(propertyId).subscribe({
      next: (res) => {
        this.floors = res.data ?? [];
        const currentFloorId = this.form.get('floorId')?.value;
        if (currentFloorId && !this.floors.some(f => f.id === currentFloorId)) {
          this.form.patchValue({ floorId: null }, { emitEvent: false });
        }
      },
      error: () => { this.floors = []; }
    });
  }

  readonly form = this.fb.group({
    propertyId: [
      this.data.unit?.propertyId ?? this.data.defaultPropertyId ?? (this.data.properties[0]?.id ?? null) as number | null,
      Validators.required
    ],
    unitType: [this.data.unit?.unitType ?? '', Validators.required],
    furnishedStatus: [this.data.unit?.furnishedStatus ?? '', Validators.required],
    floorId: [this.data.unit?.floorId ?? null as number | null],
    areaSqm: [this.data.unit?.areaSqm ?? null as number | null],
    rentAmount: [this.data.unit?.rentAmount ?? null as number | null],
    currency: [this.data.unit?.currency ?? 'OMR'],
    notes: [this.data.unit?.notes ?? '']
  });

  constructor(
    readonly ref: MatDialogRef<UnitDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: UnitDialogData,
    private readonly fb: FormBuilder,
    private readonly unitSvc: UnitService,
    private readonly floorSvc: FloorService,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly tenantSvc: TenantService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.lookupSvc.getByType('UNIT_TYPE').subscribe({
      next: (res) => {
        this.unitTypes = res.data ?? [];
        if (!this.form.get('unitType')?.value && this.unitTypes.length) {
          this.form.patchValue({ unitType: this.unitTypes[0].code }, { emitEvent: false });
        }
      },
      error: () => { this.unitTypes = []; }
    });

    this.lookupSvc.getByType('FURNISHED_STATUS').subscribe({
      next: (res) => { this.furnishedStatuses = res.data ?? []; },
      error: () => { this.furnishedStatuses = []; }
    });

    const initialPropertyId = this.form.get('propertyId')?.value;
    if (initialPropertyId) this.loadFloors(initialPropertyId);

    this.form.get('propertyId')?.valueChanges.subscribe(id => {
      this.floors = [];
      this.form.patchValue({ floorId: null }, { emitEvent: false });
      if (id) this.loadFloors(id);
    });

    if (this.data.readOnly) {
      this.form.disable();
    }

    if (this.data.readOnly && this.data.unit?.id) {
      this.loadTenantForView(this.data.unit.id);
    }
  }

  private loadTenantForView(unitId: number): void {
    this.loadingTenant = true;
    this.tenantSvc.getByUnitId(unitId).pipe(catchError(() => of(null))).subscribe({
      next: (res) => {
        this.tenantDetail = res?.data ?? null;
        this.loadingTenant = false;
      },
      error: () => {
        this.tenantDetail = null;
        this.loadingTenant = false;
      }
    });
  }

  openContract(contractId: number): void {
    this.ref.close(false);
    void this.router.navigate(['/admin/contracts', contractId]);
  }

  lookupLabel(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (this.saving) return;

    this.saving = true;
    const payload = this.form.getRawValue() as UnitRequest;
    const request$ = this.data.unit
      ? this.unitSvc.update(this.data.unit.id, payload)
      : this.unitSvc.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('UNITS.SAVE_SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('UNITS.SAVE_ERROR'));
      }
    });
  }
}
