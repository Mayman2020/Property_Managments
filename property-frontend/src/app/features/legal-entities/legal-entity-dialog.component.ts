import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { LegalEntity, LegalEntityRequest, LegalEntityService } from '../../core/services/legal-entity.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface LegalEntityDialogData {
  entity: LegalEntity | null;
}

@Component({
  selector: 'app-legal-entity-dialog',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">domain</mat-icon>
      {{ titleKey | translate }}
    </h2>

    <mat-dialog-content class="legal-entity-dialog-body">
      <p class="dialog-hint full">{{ 'LEGAL_ENTITIES.DIALOG_HINT' | translate }}</p>

      <form [formGroup]="form" class="legal-entity-form">
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="nameAr" dir="rtl" />
          <mat-error *ngIf="form.get('nameAr')?.hasError('required')">{{ 'COMMON.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="nameEn" dir="ltr" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.CR' | translate }}</mat-label>
          <input matInput formControlName="commercialRegistration" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.TAX' | translate }}</mat-label>
          <input matInput formControlName="taxNumber" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.PHONE' | translate }}</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.EMAIL' | translate }}</mat-label>
          <input matInput type="email" formControlName="email" />
          <mat-error *ngIf="form.get('email')?.hasError('email')">{{ 'COMMON.INVALID_EMAIL' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'LEGAL_ENTITIES.ADDRESS' | translate }}</mat-label>
          <textarea matInput formControlName="address" rows="2"></textarea>
        </mat-form-field>

        <mat-checkbox *ngIf="data.entity" formControlName="active" class="full checkbox-field">
          {{ 'COMMON.ACTIVE' | translate }}
        </mat-checkbox>
      </form>
    </mat-dialog-content>

    <div mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="navy-btn" type="button" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }

    mat-dialog-content.legal-entity-dialog-body {
      max-height: none !important;
      overflow-x: hidden !important;
      overflow-y: visible !important;
    }

    .dialog-hint {
      margin: 0 0 12px;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .legal-entity-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding-top: 4px;
      min-width: 0;
      max-width: 100%;
    }

    .full { grid-column: 1 / -1; }

    .checkbox-field { margin: 4px 0 2px; }

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
      .legal-entity-form { grid-template-columns: 1fr; }
    }
  `]
})
export class LegalEntityDialogComponent {
  saving = false;
  readonly form: FormGroup;

  get titleKey(): string {
    return this.data.entity ? 'LEGAL_ENTITIES.EDIT' : 'LEGAL_ENTITIES.ADD';
  }

  constructor(
    readonly ref: MatDialogRef<LegalEntityDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: LegalEntityDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: LegalEntityService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    const e = data.entity;
    this.form = this.fb.group({
      nameAr: [e?.nameAr ?? '', [Validators.required, Validators.maxLength(200)]],
      nameEn: [e?.nameEn ?? '', Validators.maxLength(200)],
      commercialRegistration: [e?.commercialRegistration ?? '', Validators.maxLength(50)],
      taxNumber: [e?.taxNumber ?? '', Validators.maxLength(50)],
      phone: [e?.phone ?? '', Validators.maxLength(30)],
      email: [e?.email ?? '', Validators.email],
      address: [e?.address ?? '', Validators.maxLength(500)],
      active: [e?.active ?? true]
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      if (this.form.invalid) {
        this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      }
      return;
    }

    const raw = this.form.getRawValue();
    const payload: LegalEntityRequest = {
      nameAr: (raw.nameAr as string).trim(),
      nameEn: (raw.nameEn as string)?.trim() || undefined,
      commercialRegistration: (raw.commercialRegistration as string)?.trim() || undefined,
      taxNumber: (raw.taxNumber as string)?.trim() || undefined,
      phone: (raw.phone as string)?.trim() || undefined,
      email: (raw.email as string)?.trim() || undefined,
      address: (raw.address as string)?.trim() || undefined,
      active: this.data.entity ? !!raw.active : true
    };

    this.saving = true;
    const req$ = this.data.entity
      ? this.svc.update(this.data.entity.id, payload)
      : this.svc.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('LEGAL_ENTITIES.SAVE_SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
