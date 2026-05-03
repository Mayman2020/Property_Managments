import { Component, Inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { FinanceService } from '../../core/services/finance.service';
import { Property } from '../../core/services/property.service';
import { SnackService } from '../../core/services/snack.service';
import { I18nService } from '../../core/i18n/i18n.service';

export interface ExpenseDialogData {
  properties: Property[];
  defaultPropertyId?: number;
}

@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatDatepickerModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'FINANCE.ADD_EXPENSE' | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="finance-dialog-form">
        <div class="dialog-intro full">
          <span class="material-icons">receipt_long</span>
          <div>
            <strong>{{ 'FINANCE.ADD_EXPENSE' | translate }}</strong>
            <p>{{ 'FINANCE.ADD_EXPENSE_HINT' | translate }}</p>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'INVENTORY.PROPERTY' | translate }}</mat-label>
          <mat-select formControlName="propertyId">
            <mat-option *ngFor="let p of data.properties" [value]="p.id">
              {{ isAr ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'FINANCE.DESCRIPTION_COL' | translate }}</mat-label>
          <input matInput formControlName="description" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'FINANCE.AMOUNT_COL' | translate }}</mat-label>
          <input matInput type="number" min="0.01" step="0.01" formControlName="amount" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'FINANCE.CURRENCY' | translate }}</mat-label>
          <mat-select formControlName="currency">
            <mat-option value="OMR">OMR</mat-option>
            <mat-option value="SAR">SAR</mat-option>
            <mat-option value="USD">USD</mat-option>
            <mat-option value="AED">AED</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'FINANCE.EXPENSE_DATE' | translate }}</mat-label>
          <input matInput [matDatepicker]="expensePicker" formControlName="expenseDate" />
          <mat-datepicker-toggle matIconSuffix [for]="expensePicker"></mat-datepicker-toggle>
          <mat-datepicker #expensePicker></mat-datepicker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button class="btn-dialog-cancel" (click)="ref.close(false)">{{ 'ACTIONS.CANCEL' | translate }}</button>
      <button mat-flat-button class="btn-dialog-confirm" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'ACTIONS.SAVE' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(480px, 92vw); padding-top: 8px; }
    .finance-dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 560px) { .finance-dialog-form { grid-template-columns: 1fr; } }
  `]
})
export class ExpenseDialogComponent {
  saving = false;
  get isAr(): boolean { return this.i18n.currentLang === 'ar'; }

  readonly form = this.fb.nonNullable.group({
    propertyId: [null as number | null, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['OMR'],
    expenseDate: [new Date(), Validators.required]
  });

  constructor(
    readonly ref: MatDialogRef<ExpenseDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ExpenseDialogData,
    private readonly fb: FormBuilder,
    private readonly svc: FinanceService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    if (data.defaultPropertyId) {
      this.form.patchValue({ propertyId: data.defaultPropertyId });
    } else if (data.properties.length === 1) {
      this.form.patchValue({ propertyId: data.properties[0].id });
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS')); return; }
    if (this.saving) return;
    this.saving = true;
    const v = this.form.getRawValue();
    this.svc.createExpense({
      propertyId: v.propertyId!,
      description: v.description,
      amount: v.amount!,
      currency: v.currency,
      expenseDate: this.toYmd(v.expenseDate)
    }).subscribe({
      next: () => { this.saving = false; this.snack.success(this.isAr ? 'تم الحفظ' : 'Saved'); this.ref.close(true); },
      error: () => { this.saving = false; }
    });
  }

  private toYmd(value: Date | string): string {
    if (typeof value === 'string') return value;
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
}
