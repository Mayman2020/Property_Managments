import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

import { RenewalRequestWithDetails, ProcessRenewalPayload } from '../../../core/services/accountant-portal.service';

export interface ProcessRenewalDialogData {
  request: RenewalRequestWithDetails;
}

@Component({
  selector: 'app-process-renewal-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatDatepickerModule, MatNativeDateModule, DialogTitleCloseDirective],
  templateUrl: './process-renewal-dialog.component.html'
})
export class ProcessRenewalDialogComponent {
  form: FormGroup;
  readonly today = new Date();
  readonly maxEndDate: Date;

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<ProcessRenewalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ProcessRenewalDialogData
  ) {
    const startDate = new Date();
    this.maxEndDate = new Date(startDate);
    this.maxEndDate.setFullYear(this.maxEndDate.getFullYear() + 1);

    this.form = this.fb.group({
      newStartDate: [null, Validators.required],
      newEndDate: [null, Validators.required],
      newMonthlyRent: [data.request.currentMonthlyRent ?? null, [Validators.required, Validators.min(1)]],
      freeMonths: [0, [Validators.min(0), Validators.max(12)]],
      newSecurityDeposit: [null],
      notes: ['']
    });
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const payload: ProcessRenewalPayload = {
      newStartDate: this.formatDate(v.newStartDate),
      newEndDate: this.formatDate(v.newEndDate),
      newMonthlyRent: v.newMonthlyRent,
      freeMonths: v.freeMonths || 0,
      newSecurityDeposit: v.newSecurityDeposit || undefined,
      notes: v.notes || undefined
    };
    this.ref.close(payload);
  }

  private formatDate(d: Date): string {
    if (!d) return '';
    return d.toISOString().split('T')[0];
  }
}
