import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
﻿import { Component, Inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

export type LookupDialogMode = 'governorate' | 'city';

export interface LookupDialogData {
  mode: LookupDialogMode;
  item: LookupItem | null;
  governorates?: LookupItem[];
}

@Component({
  selector: 'app-lookup-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule,
    TranslateModule, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title>
      {{ titleKey | translate }}
    </h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="lookup-dialog-form">

        <mat-form-field appearance="outline" class="full" *ngIf="data.mode === 'city'">
          <mat-label>{{ 'LOOKUPS.COUNTRY' | translate }}</mat-label>
          <mat-select formControlName="countryId">
            <mat-option *ngFor="let g of data.governorates" [value]="g.id">
              {{ i18n.currentLang === 'ar' ? g.nameAr : g.nameEn }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'LOOKUPS.NAME_AR' | translate }}</mat-label>
          <input matInput formControlName="nameAr">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'LOOKUPS.NAME_EN' | translate }}</mat-label>
          <input matInput formControlName="nameEn">
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
    .dialog-body { min-width: min(520px, 94vw); padding-top: 8px; }
    .lookup-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { grid-column: 1 / -1; }
    .dialog-actions { gap: 10px; padding: 8px 16px 16px; }
    @media (max-width: 520px) { .lookup-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class LookupDialogComponent {
  saving = false;
  readonly form: FormGroup;

  get titleKey(): string {
    if (this.data.mode === 'governorate') {
      return this.data.item ? 'LOOKUPS.EDIT_COUNTRY' : 'LOOKUPS.ADD_COUNTRY';
    }
    return this.data.item ? 'LOOKUPS.EDIT_CITY' : 'LOOKUPS.ADD_CITY';
  }

  constructor(
    readonly ref: MatDialogRef<LookupDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: LookupDialogData,
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
      countryId: [item?.parentId ?? (data.governorates?.[0]?.id ?? null),
        data.mode === 'city' ? Validators.required : null]
    });

    if (item) {
      this.form.get('code')?.setValidators([Validators.required, Validators.maxLength(50)]);
      this.form.get('code')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
      return;
    }
    if (this.saving) return;

    this.saving = true;
    const { nameAr, nameEn, code, sortOrder, countryId } = this.form.value;
    const item = this.data.item;

    const req$ = item
      ? this.lookupSvc.update(item.id, { code, nameAr, nameEn, sortOrder, active: true })
      : this.data.mode === 'governorate'
        ? this.lookupSvc.createCountry({ nameAr, nameEn, sortOrder, code: code?.trim() || undefined })
        : this.lookupSvc.createCity({ countryId, nameAr, nameEn, sortOrder, code: code?.trim() || undefined });

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
