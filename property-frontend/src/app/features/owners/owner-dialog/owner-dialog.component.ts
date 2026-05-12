import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { Owner, OwnerRequest, OwnerService } from '../../../core/services/owner.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { IdentityMediaFieldsComponent } from '../../../shared/components/identity-media-fields/identity-media-fields.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';

export interface OwnerDialogData {
  owner: Owner | null;
  /** When true, form is read-only and only Close is shown (details workspace). */
  readOnly?: boolean;
}

@Component({
  selector: 'app-owner-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule,
    MatDialogModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    TranslateModule,
    IdentityMediaFieldsComponent,
    AuditTrailComponent
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">person_pin</mat-icon>
      {{ titleKey | translate }}
    </h2>

    <mat-dialog-content class="owner-dialog-body">
      <form [formGroup]="form" class="owner-form">

        <section class="identity-wrap full" [class.identity-readonly]="data.readOnly">
          <app-identity-media-fields
            [compact]="true"
            [(profileImageUrl)]="profileImageUrl"
            [(civilIdImageUrl)]="civilIdImageUrl">
          </app-identity-media-fields>
        </section>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.FULL_NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="fullNameAr">
          <mat-error *ngIf="form.get('fullNameAr')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.FULL_NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="fullNameEn">
          <mat-error *ngIf="form.get('fullNameEn')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.NATIONAL_ID' | translate }}</mat-label>
          <input matInput formControlName="nationalId">
          <mat-error *ngIf="form.get('nationalId')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone">
          <mat-error *ngIf="form.get('phone')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.EMAIL' | translate }}</mat-label>
          <input matInput formControlName="email" type="email">
          <mat-hint *ngIf="!data.owner">{{ 'OWNERS.EMAIL_PORTAL_HINT' | translate }}</mat-hint>
          <mat-error *ngIf="form.get('email')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">{{ 'COMMON.INVALID_EMAIL' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.ADDRESS' | translate }}</mat-label>
          <textarea matInput formControlName="address" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'OWNERS.NOTES' | translate }}</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

      </form>

      <app-audit-trail *ngIf="data.owner" class="owner-audit"
        [createdAt]="data.owner.createdAt"
        [updatedAt]="data.owner.updatedAt"
        [createdBy]="data.owner.createdBy"
        [createdByName]="data.owner.createdByName"
        [modifiedBy]="data.owner.modifiedBy"
        [modifiedByName]="data.owner.modifiedByName">
      </app-audit-trail>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="ref.close(null)">
        {{ (data.readOnly ? 'ACTIONS.CLOSE' : 'ACTIONS.CANCEL') | translate }}
      </button>
      <button mat-flat-button class="navy-btn" type="button" *ngIf="!data.readOnly" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* إلغاء سكرول محتوى الحوار الزائد (Material يفرض max-height + overflow) */
    mat-dialog-content.owner-dialog-body {
      max-height: none !important;
      overflow-x: hidden !important;
      overflow-y: visible !important;
    }

    .owner-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding-top: 4px;
      min-width: 0;
      max-width: 100%;
    }
    .full { grid-column: 1 / -1; }

    .identity-wrap {
      padding-bottom: 12px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--line, rgba(0,0,0,.08));
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex; gap: 12px; justify-content: flex-end;
    }
    .navy-btn { background: var(--navy-800) !important; color: white !important; }

    .owner-audit { margin-top: 14px; }
    .identity-readonly { pointer-events: none; opacity: 0.92; }

    @media (max-width: 600px) {
      .owner-form { grid-template-columns: 1fr; min-width: unset; }
    }
  `]
})
export class OwnerDialogComponent {
  saving = false;
  profileImageUrl = '';
  civilIdImageUrl = '';
  readonly form: FormGroup;

  get titleKey(): string {
    if (this.data.readOnly) return 'OWNERS.VIEW_DETAILS';
    return this.data.owner ? 'OWNERS.EDIT' : 'OWNERS.ADD';
  }

  constructor(
    readonly ref: MatDialogRef<OwnerDialogComponent, Owner | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OwnerDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: OwnerService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    const o = data.owner;
    this.profileImageUrl = o?.profileImageUrl ?? '';
    this.civilIdImageUrl = o?.civilIdImageUrl ?? '';

    const legacy = (o?.fullName ?? '').trim();
    const arInit = ((o?.fullNameAr ?? '').trim() || legacy).trim();
    const enInit = ((o?.fullNameEn ?? '').trim() || legacy).trim();

    const emailValidators = [Validators.email, Validators.maxLength(100)];
    if (!data.owner) {
      emailValidators.unshift(Validators.required);
    }
    this.form = this.fb.group({
      fullNameAr: [arInit, [Validators.required, Validators.maxLength(150)]],
      fullNameEn: [enInit, [Validators.required, Validators.maxLength(150)]],
      nationalId: [o?.nationalId ?? '', [Validators.required, Validators.maxLength(30)]],
      phone: [o?.phone ?? '', [Validators.required, Validators.maxLength(20)]],
      email: [o?.email ?? '', emailValidators],
      address: [o?.address ?? ''],
      notes: [o?.notes ?? '']
    });
    if (data.readOnly) {
      this.form.disable();
    }
  }

  hasRequiredIdentityMedia(): boolean {
    return !!this.profileImageUrl?.trim() && !!this.civilIdImageUrl?.trim();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (this.saving) return;
    if (!this.hasRequiredIdentityMedia()) {
      this.snack.error(this.i18n.instant('COMMON.ATTACH_PROFILE_AND_CIVIL'));
      return;
    }
    this.saving = true;
    const payload: OwnerRequest = {
      fullNameAr: (this.form.value.fullNameAr as string).trim(),
      fullNameEn: (this.form.value.fullNameEn as string).trim(),
      nationalId: (this.form.value.nationalId as string).trim(),
      phone: (this.form.value.phone as string).trim(),
      email: this.form.value.email || undefined,
      profileImageUrl: this.profileImageUrl || undefined,
      civilIdImageUrl: this.civilIdImageUrl || undefined,
      address: this.form.value.address || undefined,
      notes: this.form.value.notes || undefined
    };
    const req$ = this.data.owner
      ? this.svc.update(this.data.owner.id, payload)
      : this.svc.create(payload);

    req$.subscribe({
      next: (res) => {
        this.saving = false;
        this.snack.success(this.i18n.instant(this.data.owner ? 'OWNERS.UPDATE_SUCCESS' : 'OWNERS.CREATE_SUCCESS'));
        this.ref.close(res.data ?? null);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
