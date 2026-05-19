import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import {
  MaintenanceContractInvoiceResponse,
  MaintenanceInvoicePaymentPlanRequest
} from '../../../core/services/maintenance-contract-invoice.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';

export interface MaintenanceInvoicePaymentDialogData {
  invoice: MaintenanceContractInvoiceResponse;
  currency?: string | null;
  mode?: 'plan' | 'installment';
  paymentId?: number;
}

export type MaintenanceInvoicePaymentDialogResult =
  | { type: 'plan'; payload: MaintenanceInvoicePaymentPlanRequest }
  | { type: 'installment'; paymentId: number; payload: { receiptUrl: string; notes?: string | null } };

@Component({
  selector: 'app-maintenance-invoice-payment-dialog',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    UploadZoneComponent
  ],
  templateUrl: './maintenance-invoice-payment-dialog.component.html',
  styleUrl: './maintenance-invoice-payment-dialog.component.scss'
})
export class MaintenanceInvoicePaymentDialogComponent implements OnInit {
  form: FormGroup;
  receiptUrls: string[] = [];
  readonly todayDate = new Date();
  submitting = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<MaintenanceInvoicePaymentDialogComponent, MaintenanceInvoicePaymentDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: MaintenanceInvoicePaymentDialogData,
    readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      mode: ['FULL', Validators.required],
      installmentCount: [2, [Validators.required, Validators.min(1), Validators.max(4)]],
      notes: [''],
      installments: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (this.isInstallmentMode) {
      this.form.get('mode')?.setValue('FULL');
      this.form.get('installmentCount')?.disable();
      return;
    }
    this.rebuildInstallments();
    this.form.get('mode')?.valueChanges.subscribe(() => this.rebuildInstallments());
    this.form.get('installmentCount')?.valueChanges.subscribe(() => this.rebuildInstallments());
  }

  get isInstallmentMode(): boolean {
    return this.data.mode === 'installment';
  }

  get installments(): FormArray {
    return this.form.get('installments') as FormArray;
  }

  get selectedMode(): 'FULL' | 'SCHEDULED' {
    return this.form.get('mode')?.value === 'SCHEDULED' ? 'SCHEDULED' : 'FULL';
  }

  get currency(): string {
    return this.data.currency || 'SAR';
  }

  paymentAmount(): number {
    if (!this.isInstallmentMode) return this.data.invoice.amount;
    return this.data.invoice.payments?.find(p => p.id === this.data.paymentId)?.amount ?? this.data.invoice.remainingAmount ?? 0;
  }

  installmentAmount(index: number): number {
    const count = Number(this.form.get('installmentCount')?.value || 1);
    const total = Number(this.data.invoice.amount || 0);
    const base = Math.floor((total / count) * 1000) / 1000;
    if (index === count - 1) {
      return Number((total - base * (count - 1)).toFixed(3));
    }
    return base;
  }

  setReceiptUrls(urls: string[]): void {
    this.receiptUrls = urls;
  }

  chooseMode(mode: 'FULL' | 'SCHEDULED'): void {
    this.form.get('mode')?.setValue(mode);
  }

  submit(): void {
    if (this.receiptUrls.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const receiptUrl = this.receiptUrls[0];
    const notes = this.form.get('notes')?.value || null;
    if (this.isInstallmentMode) {
      this.dialogRef.close({
        type: 'installment',
        paymentId: this.data.paymentId!,
        payload: { receiptUrl, notes }
      });
      return;
    }

    if (this.selectedMode === 'FULL') {
      this.dialogRef.close({
        type: 'plan',
        payload: { mode: 'FULL', receiptUrl, notes, installmentCount: 1, installments: [{ installmentNo: 1, dueDate: this.toIsoDate(this.todayDate) }] }
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const installments = this.installments.controls.map((control, index) => ({
      installmentNo: index + 1,
      dueDate: this.toIsoDate(control.get('dueDate')?.value as Date)
    }));
    this.dialogRef.close({
      type: 'plan',
      payload: {
        mode: 'SCHEDULED',
        receiptUrl,
        notes,
        installmentCount: installments.length,
        installments
      }
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }

  private rebuildInstallments(): void {
    this.installments.clear();
    if (this.selectedMode !== 'SCHEDULED') {
      return;
    }
    const count = Math.min(4, Math.max(1, Number(this.form.get('installmentCount')?.value || 1)));
    for (let i = 0; i < count; i++) {
      this.installments.push(this.fb.group({
        dueDate: [i === 0 ? new Date() : null, Validators.required]
      }));
    }
  }

  private toIsoDate(date: Date | null | undefined): string {
    if (!date) return '';
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
  }
}

