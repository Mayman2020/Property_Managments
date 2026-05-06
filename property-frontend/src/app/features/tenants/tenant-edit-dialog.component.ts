import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { Tenant, TenantRequest, TenantService } from '../../core/services/tenant.service';
import { Unit, UnitService } from '../../core/services/unit.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadZoneComponent } from '../../shared/components/upload-zone/upload-zone.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { AuditTrailComponent } from '../../shared/components/audit-trail/audit-trail.component';

export interface TenantEditDialogData {
  tenantId: number;
  properties: Property[];
  /** Same layout as edit, read-only (like owner details dialog). */
  readOnly?: boolean;
}

@Component({
  selector: 'app-tenant-edit-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    UploadZoneComponent,
    SearchableSelectComponent,
    AuditTrailComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">{{ data.readOnly ? 'visibility' : 'edit' }}</mat-icon>
      {{ titleKey | translate }}
    </h2>
    <mat-dialog-content class="edit-body">
      <div class="loading-row" *ngIf="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>
      <form *ngIf="!loading && form" [formGroup]="form" class="edit-form">
        <section class="full">
          <app-upload-zone
            layout="identity"
            [tileRound]="false"
            [multiple]="false"
            [accept]="'image/*'"
            [readOnly]="!!data.readOnly"
            [urlList]="profileUrlList"
            (urlListChange)="onProfileUrls($event)"
            [label]="'OWNERS.PROFILE_IMAGE' | translate">
          </app-upload-zone>
          <p class="hint" *ngIf="!data.readOnly">{{ 'TENANTS.EDIT_PROFILE_HINT' | translate }}</p>
        </section>

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
          <input matInput type="email" formControlName="email" />
          <mat-error *ngIf="form.get('email')?.hasError('email')">{{ 'COMMON.INVALID_EMAIL' | translate }}</mat-error>
        </mat-form-field>

        <div class="section-divider full"><span>{{ 'TENANTS.SCOPE' | translate }}</span></div>
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

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'TENANTS.LEASE_START' | translate }}</mat-label>
          <input matInput type="date" formControlName="leaseStart" />
          <mat-error *ngIf="form.get('leaseStart')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'TENANTS.LEASE_END' | translate }}</mat-label>
          <input matInput type="date" formControlName="leaseEnd" />
          <mat-error *ngIf="form.get('leaseEnd')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <div class="full media-block">
          <app-upload-zone
            [multiple]="true"
            [accept]="'image/*,.pdf,.doc,.docx'"
            [readOnly]="!!data.readOnly"
            [urlList]="leaseContractUrls"
            (urlListChange)="leaseContractUrls = $event"
            [label]="'TENANTS.LEASE_CONTRACT_UPLOAD_LABEL' | translate">
          </app-upload-zone>
        </div>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'MAINTENANCE.DESCRIPTION' | translate }}</mat-label>
          <textarea matInput rows="2" formControlName="notes"></textarea>
        </mat-form-field>

        <app-audit-trail *ngIf="loaded" class="full"
          [createdAt]="loaded.createdAt"
          [updatedAt]="loaded.updatedAt"
          [createdBy]="loaded.createdBy"
          [createdByName]="loaded.createdByName"
          [modifiedBy]="loaded.modifiedBy"
          [modifiedByName]="loaded.modifiedByName">
        </app-audit-trail>
      </form>
    </mat-dialog-content>
    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">
        {{ (data.readOnly ? 'ACTIONS.CLOSE' : 'ACTIONS.CANCEL') | translate }}
      </button>
      <button mat-flat-button class="navy-btn" type="button" *ngIf="!data.readOnly" (click)="save()" [disabled]="saving || loading || !form">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 10px; }
    .dialog-title-icon { color: var(--navy-800, #1a2744); }
    /* Let content scroll inside the panel (same idea as add-tenant dialog + global app-dialog-panel max-height). */
    .edit-body {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      padding-top: 6px;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .loading-row { display: flex; justify-content: center; padding: 28px; }
    .edit-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 4px; }
    .full { grid-column: 1 / -1; }
    .hint { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; }
    .section-divider {
      display: flex; align-items: center; gap: 10px; margin: 6px 0 2px;
      font-size: 0.78rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: .04em;
    }
    .section-divider::before, .section-divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }
    .media-block { margin: 4px 0; }
    .dialog-actions-row { padding: 12px 16px; border-top: 1px solid var(--line); display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
    .navy-btn { background: var(--navy-800) !important; color: #fff !important; }
    @media (max-width: 600px) { .edit-form { grid-template-columns: 1fr; } }
  `]
})
export class TenantEditDialogComponent implements OnInit {
  loading = true;
  saving = false;
  form: FormGroup | null = null;
  loaded: Tenant | null = null;
  units: Unit[] = [];
  leaseContractUrls: string[] = [];
  profileUrlList: string[] = [];

  get scope(): 'UNIT' | 'PROPERTY' {
    return (this.form?.get('scope')?.value ?? 'UNIT') as 'UNIT' | 'PROPERTY';
  }

  get titleKey(): string {
    return this.data.readOnly ? 'TENANTS.VIEW_DETAILS' : 'TENANTS.EDIT_TENANT';
  }

  constructor(
    readonly ref: MatDialogRef<TenantEditDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: TenantEditDialogData,
    private readonly fb: FormBuilder,
    private readonly tenantSvc: TenantService,
    private readonly unitSvc: UnitService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.tenantSvc.getById(this.data.tenantId).subscribe({
      next: (res) => {
        const t = res.data;
        if (!t) {
          this.loading = false;
          return;
        }
        this.loaded = t;
        const scope: 'UNIT' | 'PROPERTY' = t.unitId ? 'UNIT' : 'PROPERTY';
        this.leaseContractUrls = [...(t.leaseContractFiles ?? [])];
        const prof = (t.profileImage ?? '').trim();
        this.profileUrlList = prof ? [prof] : [];
        this.form = this.fb.group({
          fullNameAr: [t.fullNameAr ?? '', Validators.required],
          fullNameEn: [t.fullNameEn ?? '', Validators.required],
          phone: [t.phone ?? '', Validators.required],
          nationalId: [t.nationalId ?? '', Validators.required],
          email: [t.email ?? '', Validators.email],
          scope: [scope, Validators.required],
          propertyId: [t.propertyId ?? null, Validators.required],
          unitId: [t.unitId ?? null],
          leaseStart: [this.toInputDate(t.leaseStart), Validators.required],
          leaseEnd: [this.toInputDate(t.leaseEnd), Validators.required],
          notes: [t.notes ?? '']
        });
        this.form.get('scope')?.valueChanges.subscribe(() => this.applyScope());
        this.form.get('propertyId')?.valueChanges.subscribe((id) => {
          if (id) this.loadUnits(Number(id), t.unitId ?? undefined);
          else this.units = [];
        });
        const pid = t.propertyId;
        if (pid) this.loadUnits(pid, t.unitId ?? undefined);
        this.applyScope();
        if (this.data.readOnly && this.form) {
          this.form.disable({ emitEvent: false });
        }
        this.loading = false;
      },
      error: () => {
        this.snack.error(this.i18n.instant('TENANTS.LOAD_ERROR'));
        this.loading = false;
      }
    });
  }

  onProfileUrls(urls: string[]): void {
    this.profileUrlList = urls ?? [];
  }

  private toInputDate(s?: string | null): string {
    if (!s) return '';
    return s.length >= 10 ? s.slice(0, 10) : '';
  }

  private applyScope(): void {
    const unitCtrl = this.form?.get('unitId');
    if (!unitCtrl) return;
    if (this.scope === 'UNIT') {
      unitCtrl.setValidators([Validators.required]);
    } else {
      unitCtrl.clearValidators();
      unitCtrl.setValue(null, { emitEvent: false });
    }
    unitCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private loadUnits(propertyId: number, keepUnitId?: number): void {
    this.unitSvc.getByProperty(propertyId, 0, 500).subscribe({
      next: (res) => {
        const all = res.data?.content ?? [];
        this.units = all.filter((u) => u.id === keepUnitId || (!u.rented && !u.reserved));
      },
      error: () => { this.units = []; }
    });
  }

  save(): void {
    if (!this.form || !this.loaded) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    const prof = (this.profileUrlList[0] ?? '').trim();
    if (!prof) {
      this.snack.error(this.i18n.instant('COMMON.ATTACH_PROFILE_PHOTO'));
      return;
    }
    if (this.leaseContractUrls.length === 0) {
      this.snack.error(this.i18n.instant('TENANTS.CONTRACT_REQUIRED'));
      return;
    }
    const raw = this.form.getRawValue();
    const leaseStart = (raw.leaseStart as string)?.trim();
    const leaseEnd = (raw.leaseEnd as string)?.trim();
    if (!leaseStart || !leaseEnd) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_REQUIRED'));
      return;
    }
    if (leaseEnd < leaseStart) {
      this.snack.error(this.i18n.instant('TENANTS.LEASE_PERIOD_INVALID'));
      return;
    }
    const ar = (raw.fullNameAr as string).trim();
    const en = (raw.fullNameEn as string).trim();
    const payload: TenantRequest = {
      fullName: ar || en,
      fullNameAr: ar,
      fullNameEn: en,
      propertyId: raw.propertyId || undefined,
      unitId: this.scope === 'UNIT' ? (raw.unitId || undefined) : undefined,
      userId: this.loaded.userId ?? undefined,
      nationalId: (raw.nationalId as string).trim(),
      phone: (raw.phone as string).trim(),
      email: (raw.email as string)?.trim() || undefined,
      leaseStart,
      leaseEnd,
      profileImage: prof,
      leaseContractFiles: [...this.leaseContractUrls],
      notes: (raw.notes as string)?.trim() || undefined
    };
    this.saving = true;
    this.tenantSvc.update(this.data.tenantId, payload).subscribe({
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
}
