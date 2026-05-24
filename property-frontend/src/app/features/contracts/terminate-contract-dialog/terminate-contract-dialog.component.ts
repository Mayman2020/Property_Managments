import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { ContractService } from '../../../core/services/contract.service';

export interface TerminateContractDialogData {
  contractId: number;
  currency: string;
}

function handoverFormValidator(group: AbstractControl): ValidationErrors | null {
  const has = group.get('hasDamages')?.value === true;
  if (!has) return null;
  const raw = group.get('damagesAmount')?.value;
  const n = raw === '' || raw == null ? null : Number(raw);
  if (n == null || Number.isNaN(n) || n < 0) {
    return { damagesAmountInvalid: true };
  }
  return null;
}

@Component({
  selector: 'app-terminate-contract-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatRadioModule, MatSlideToggleModule, MatProgressSpinnerModule, TranslateModule
  ],
  templateUrl: './terminate-contract-dialog.component.html',
  styleUrl: './terminate-contract-dialog.component.scss'
})
export class TerminateContractDialogComponent {
  form: FormGroup;
  saving = false;
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TerminateContractDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: TerminateContractDialogData,
    private contractSvc: ContractService
  ) {
    this.form = this.fb.group({
      terminationDate: [new Date(), Validators.required],
      terminationReason: ['', [Validators.required, Validators.minLength(5)]],
      securityDepositReturnToTenant: [true, Validators.required],
      hasDamages: [false, Validators.required],
      damagesAmount: [null as number | null],
      damagesPaidByTenant: [false, Validators.required]
    }, { validators: handoverFormValidator });
  }

  get hasDamages(): boolean {
    return this.form.get('hasDamages')?.value === true;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    const v = this.form.value;
    const body = {
      terminationDate: this.toIsoDate(v.terminationDate),
      terminationReason: (v.terminationReason as string).trim(),
      securityDepositReturnToTenant: !!v.securityDepositReturnToTenant,
      hasDamages: !!v.hasDamages,
      damagesAmount: v.hasDamages ? Number(v.damagesAmount) : null,
      damagesPaidByTenant: v.hasDamages ? !!v.damagesPaidByTenant : false
    };
    this.contractSvc.terminate(this.data.contractId, body).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.errorMsg = (err as Error)?.message ?? 'COMMON.ERROR';
        this.saving = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private toIsoDate(d: Date): string {
    return new Date(d).toISOString().split('T')[0];
  }
}
