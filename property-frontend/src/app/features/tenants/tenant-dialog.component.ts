import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { TenantService, TenantRequest } from '../../core/services/tenant.service';
import { UnitService, Unit } from '../../core/services/unit.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { User } from '../../core/models/user.model';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';

export interface TenantDialogData {
  properties: Property[];
  tenantUsers: User[];
  defaultPropertyId?: number;
}

@Component({
  selector: 'app-tenant-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatDatepickerModule, MatProgressSpinnerModule,
    MatSelectModule, UploadZoneComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ 'TENANTS.ADD' | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="tenant-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">groups</span>
          <div>
            <strong>{{ 'TENANTS.ADD' | translate }}</strong>
            <p>{{ isAr ? 'أضف مستأجرًا جديدًا واربطه بالعقار والوحدة وملفات العقد.' : 'Create a new tenant and link them to the property, unit, and contract files.' }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'PROFILE.FULL_NAME' | translate }}</mat-label>
          <input matInput formControlName="fullName" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'TENANTS.SCOPE' | translate }}</mat-label>
          <mat-select formControlName="scope">
            <mat-option value="UNIT">{{ 'TENANTS.SCOPE_UNIT' | translate }}</mat-option>
            <mat-option value="PROPERTY">{{ 'TENANTS.SCOPE_PROPERTY' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'REQUEST_FORM.PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ isAr ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="scope === 'UNIT'">
          <mat-label>{{ 'REQUEST_FORM.UNIT' | translate }}</mat-label>
          <mat-select formControlName="unitId">
            <mat-option *ngFor="let u of units" [value]="u.id">{{ u.unitNumber }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'TENANTS.SELECT_USER' | translate }}</mat-label>
          <mat-select formControlName="userId">
            <mat-option [value]="null">{{ 'TENANTS.NO_USER_LINK' | translate }}</mat-option>
            <mat-option *ngFor="let u of data.tenantUsers" [value]="u.id">{{ u.fullName }} ({{ u.email }})</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'PROFILE.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'AUTH.EMAIL' | translate }}</mat-label>
          <input matInput formControlName="email" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'TENANTS.NATIONAL_ID' | translate }}</mat-label>
          <input matInput formControlName="nationalId" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'TENANTS.LEASE_START' | translate }}</mat-label>
          <input matInput [matDatepicker]="pickerStart" formControlName="leaseStart" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerStart"></mat-datepicker-toggle>
          <mat-datepicker #pickerStart></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'TENANTS.LEASE_END' | translate }}</mat-label>
          <input matInput [matDatepicker]="pickerEnd" formControlName="leaseEnd" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerEnd"></mat-datepicker-toggle>
          <mat-datepicker #pickerEnd></mat-datepicker>
        </mat-form-field>

        <div class="full">
          <app-upload-zone
            [multiple]="true"
            [accept]="'image/*,.pdf,.doc,.docx'"
            [label]="'TENANTS.LEASE_CONTRACT_UPLOAD_LABEL' | translate"
            (filesUploaded)="onFiles($event)">
          </app-upload-zone>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'MAINTENANCE.DESCRIPTION' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(600px, 94vw); padding-top: 8px; max-height: 80vh; }
    .tenant-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 640px) { .tenant-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class TenantDialogComponent implements OnInit {
  saving = false;
  units: Unit[] = [];
  leaseContractUrls: string[] = [];
  form: FormGroup;

  get scope(): 'UNIT' | 'PROPERTY' { return this.form.get('scope')?.value ?? 'UNIT'; }
  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  constructor(
    readonly ref: MatDialogRef<TenantDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: TenantDialogData,
    private readonly fb: FormBuilder,
    private readonly tenantSvc: TenantService,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      scope: ['UNIT', Validators.required],
      propertyId: [data.defaultPropertyId ?? (data.properties[0]?.id ?? null)],
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
    this.form.get('scope')?.valueChanges.subscribe(() => this.applyScopeRules());
    this.form.get('propertyId')?.valueChanges.subscribe((id) => {
      if (id) this.loadUnits(id as number);
      else this.units = [];
    });
    this.applyScopeRules();
    const initProp = this.form.get('propertyId')?.value;
    if (initProp) this.loadUnits(initProp);

    this.form.get('userId')?.valueChanges.subscribe((id) => {
      const user = this.data.tenantUsers.find((u) => u.id === id);
      if (!user) return;
      if (!this.form.get('fullName')?.value) {
        this.form.patchValue({ fullName: user.fullName || '' }, { emitEvent: false });
      }
      if (!this.form.get('email')?.value) {
        this.form.patchValue({ email: user.email || '' }, { emitEvent: false });
      }
    });
  }

  onFiles(urls: string[]): void {
    this.leaseContractUrls = [...new Set([...this.leaseContractUrls, ...urls])];
  }

  save(): void {
    if (this.form.invalid) {
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
      next: (res) => this.units = res.data?.content ?? [],
      error: () => this.units = []
    });
  }

  private toDateString(d: Date | string | null): string | undefined {
    if (!d) return undefined;
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
