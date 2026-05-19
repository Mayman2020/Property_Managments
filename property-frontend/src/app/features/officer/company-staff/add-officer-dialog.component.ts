import { Component, Inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { CompanyStaffService, CompanyOfficer, CompanyOfficerCreateRequest, CompanyStaffProperty } from '../../../core/services/company-staff.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { IdentityMediaFieldsComponent } from '../../../shared/components/identity-media-fields/identity-media-fields.component';
import { TranslateModule } from '@ngx-translate/core';

export interface OfficerDialogData {
  officer?: CompanyOfficer;
}

@Component({
  selector: 'app-add-officer-dialog',
  standalone: true,
  imports: [TranslateModule, 
    NgIf,
    NgFor,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    IdentityMediaFieldsComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">engineering</mat-icon>
      {{ isEdit ? (('INLINE_TEXT.EDIT_MAINTENANCE_OFFICER' | translate)) : (('INLINE_TEXT.ADD_MAINTENANCE_OFFICER' | translate)) }}
    </h2>

    <mat-dialog-content class="officer-dialog-body">
      <form [formGroup]="form" class="officer-dialog-form">
        <section class="form-section full">
          <app-identity-media-fields
            [compact]="true"
            [showCivilSection]="true"
            [(profileImageUrl)]="profileImageUrl"
            [(civilIdImageUrl)]="civilIdImageUrl">
          </app-identity-media-fields>
        </section>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ ('INLINE_TEXT.NAME_ARABIC' | translate) }}</mat-label>
          <input matInput formControlName="fullNameAr" dir="rtl" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ ('INLINE_TEXT.NAME_ENGLISH' | translate) }}</mat-label>
          <input matInput formControlName="fullNameEn" dir="ltr" />
          <mat-error *ngIf="form.get('fullNameEn')?.hasError('required')">{{ ('INLINE_TEXT.REQUIRED' | translate) }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ ('INLINE_TEXT.PHONE_2' | translate) }}</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ ('INLINE_TEXT.EMAIL' | translate) }}</mat-label>
          <input matInput type="email" formControlName="email" dir="ltr" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">{{ ('INLINE_TEXT.REQUIRED' | translate) }}</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">{{ ('INLINE_TEXT.INVALID_EMAIL' | translate) }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" *ngIf="assignableProperties.length">
          <mat-label>{{ ('INLINE_TEXT.PROPERTY' | translate) }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let property of assignableProperties" [value]="property.propertyId">
              {{ propertyLabel(property) }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('propertyId')?.hasError('required')">{{ ('INLINE_TEXT.REQUIRED' | translate) }}</mat-error>
        </mat-form-field>

        <div class="section-divider full">
          <span>{{ ('INLINE_TEXT.LOGIN_ACCESS' | translate) }}</span>
        </div>

        <div class="login-note full">
          <mat-icon>lock_reset</mat-icon>
          <span>
            {{ ('INLINE_TEXT.ON_CREATE_A_USER_ACCOUNT_USES_THE_DEFAULT_PASSWORD_1234' | translate) }}
          </span>
        </div>
      </form>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="dialogRef.close(null)" [disabled]="saving">
        {{ ('INLINE_TEXT.CANCEL' | translate) }}
      </button>
      <button mat-flat-button class="navy-btn" type="button" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ ('INLINE_TEXT.SAVE' | translate) }}</span>
      </button>
    </div>
  `,
  styles: [`
    .officer-dialog-body { padding-top: 4px; }
    .officer-dialog-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding-top: 4px;
    }
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
    .section-divider::before,
    .section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--line);
    }
    .login-note {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      line-height: 1.7;
      font-size: 0.84rem;
    }
    .login-note mat-icon {
      color: var(--amber-700);
      flex: 0 0 auto;
    }
    .dialog-actions-row {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      background: var(--surface-2);
    }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    @media (max-width: 640px) {
      .officer-dialog-form { grid-template-columns: 1fr; }
    }
  `]
})
export class AddOfficerDialogComponent {
  form: FormGroup;
  saving = false;
  profileImageUrl = '';
  civilIdImageUrl = '';
  assignableProperties: CompanyStaffProperty[] = [];

  constructor(
    readonly dialogRef: MatDialogRef<AddOfficerDialogComponent, CompanyOfficer | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OfficerDialogData,
    private readonly fb: FormBuilder,
    private readonly staffSvc: CompanyStaffService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    const officer = data?.officer;
    this.profileImageUrl = officer?.profileImageUrl ?? '';
    this.civilIdImageUrl = officer?.civilIdImageUrl ?? '';
    this.form = this.fb.group({
      fullNameAr: [officer?.fullNameAr ?? ''],
      fullNameEn: [officer?.fullNameEn ?? officer?.fullName ?? '', Validators.required],
      phone: [officer?.phone ?? ''],
      email: [officer?.email ?? '', [Validators.required, Validators.email]],
      propertyId: [officer?.propertyId ?? null]
    });
    this.loadAssignableProperties();
  }

  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }
  get isEdit(): boolean { return !!this.data?.officer?.id; }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      this.snack.error(this.i18n.instant('INLINE_TEXT.PLEASE_FILL_REQUIRED_FIELDS'));
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CompanyOfficerCreateRequest = {
      email: String(raw.email).trim().toLowerCase(),
      fullName: String(raw.fullNameEn || raw.fullNameAr || '').trim(),
      fullNameAr: String(raw.fullNameAr || '').trim() || undefined,
      fullNameEn: String(raw.fullNameEn || '').trim() || undefined,
      phone: String(raw.phone || '').trim() || undefined,
      profileImageUrl: this.profileImageUrl.trim() || undefined,
      civilIdImageUrl: this.civilIdImageUrl.trim() || undefined,
      propertyId: raw.propertyId ? Number(raw.propertyId) : undefined
    };

    this.saving = true;
    const request$ = this.isEdit
      ? this.staffSvc.updateOfficer(this.data.officer!.id, payload)
      : this.staffSvc.createOfficer(payload);

    request$.subscribe({
      next: (res) => {
        this.saving = false;
        this.dialogRef.close(res.data);
      },
      error: (err: unknown) => {
        this.saving = false;
        const msg = (err as { error?: { message?: string } })?.error?.message;
        this.snack.error(msg || (this.i18n.instant('INLINE_TEXT.AN_ERROR_OCCURRED')));
      }
    });
  }

  propertyLabel(property: CompanyStaffProperty): string {
    const ar = property.propertyNameAr?.trim();
    const en = property.propertyNameEn?.trim();
    const fallback = property.propertyName?.trim();
    const name = this.isAr ? (ar || en || fallback) : (en || ar || fallback);
    return property.contractNumber ? `${name || property.propertyId} - ${property.contractNumber}` : (name || `#${property.propertyId}`);
  }

  private loadAssignableProperties(): void {
    this.staffSvc.listMyProperties().subscribe({
      next: (res) => {
        this.assignableProperties = res.data ?? [];
        const control = this.form.get('propertyId');
        if (this.assignableProperties.length === 1 && !control?.value) {
          control?.setValue(this.assignableProperties[0].propertyId);
        }
        if (this.assignableProperties.length > 1) {
          control?.addValidators(Validators.required);
          control?.updateValueAndValidity();
        }
      },
      error: () => { this.assignableProperties = []; }
    });
  }
}
