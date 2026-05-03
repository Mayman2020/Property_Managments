import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';

import { LookupItem, LookupService, LookupType } from '../../core/services/lookup.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface ClassificationDialogData {
  type: LookupType;
  item: LookupItem | null;
}

@Component({
  selector: 'app-classification-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule,
    MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatSlideToggleModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.item ? ('ACTIONS.EDIT' | translate) : ('ACTIONS.ADD' | translate) }}
    </h2>

    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="classif-form">

        <mat-form-field appearance="outline">
          <mat-label>{{ 'LOOKUPS.NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="nameAr" dir="rtl">
          <mat-error *ngIf="form.get('nameAr')?.hasError('required')">{{ 'VALIDATION.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'LOOKUPS.NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="nameEn" dir="ltr">
          <mat-error *ngIf="form.get('nameEn')?.hasError('required')">{{ 'VALIDATION.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="data.item">
          <mat-label>{{ 'LOOKUPS.CODE' | translate }}</mat-label>
          <input matInput formControlName="code" dir="ltr" [readonly]="true">
          <mat-hint>{{ 'CLASSIFICATIONS.CODE_AUTO_HINT' | translate }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'LOOKUPS.SORT_ORDER' | translate }}</mat-label>
          <input matInput type="number" formControlName="sortOrder">
        </mat-form-field>

        <mat-slide-toggle formControlName="active" *ngIf="data.item">
          {{ 'COMMON.ACTIVE' | translate }}
        </mat-slide-toggle>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(480px, 94vw); padding-top: 8px; }
    .classif-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    mat-form-field { grid-column: span 1; }
    mat-form-field:first-child, mat-form-field:nth-child(2) { grid-column: 1 / -1; }
    mat-slide-toggle { grid-column: 1 / -1; }
    .dialog-actions { gap: 10px; padding: 8px 16px 16px; }
    @media (max-width: 480px) { .classif-form { grid-template-columns: 1fr; } }
  `]
})
export class ClassificationDialogComponent {
  saving = false;
  readonly form: FormGroup;

  constructor(
    readonly ref: MatDialogRef<ClassificationDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ClassificationDialogData,
    private readonly fb: FormBuilder,
    private readonly lookupSvc: LookupService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    const item = data.item;
    this.form = this.fb.group({
      nameAr: [item?.nameAr ?? '', [Validators.required, Validators.maxLength(150)]],
      nameEn: [item?.nameEn ?? '', [Validators.required, Validators.maxLength(150)]],
      code: [item?.code ?? '', [Validators.maxLength(50)]],
      sortOrder: [item?.sortOrder ?? 0],
      active: [item?.active ?? true]
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (this.saving) return;
    this.saving = true;
    const { nameAr, nameEn, code, sortOrder, active } = this.form.value;
    const item = this.data.item;

    const req$ = item
      ? this.lookupSvc.update(item.id, { code: code || item.code, nameAr, nameEn, sortOrder, active })
      : this.lookupSvc.createClassification({ type: this.data.type, nameAr, nameEn, sortOrder, code: code?.trim() || undefined });

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err.message || this.i18n.instant('LOOKUPS.SAVE_ERROR'));
      }
    });
  }
}
