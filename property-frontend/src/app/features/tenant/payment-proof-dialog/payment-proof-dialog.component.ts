import { Component, Inject, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import { RentPaymentSchedule } from '../../../core/models/contract.model';
import { UploadPaymentProofPayload } from '../../../core/services/tenant-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';

export interface PaymentProofDialogData {
  row: RentPaymentSchedule;
}

@Component({
  selector: 'app-payment-proof-dialog',
  standalone: true,
  imports: [
    NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    UploadZoneComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ 'TENANT_PORTAL.PAYMENT_PROOF' | translate }}</h2>
    <mat-dialog-content [formGroup]="form">
      <div class="dialog-summary">
        <div>
          <span>{{ 'CONTRACTS.DUE_DATE' | translate }}</span>
          <strong>{{ data.row.dueDate }}</strong>
        </div>
        <div>
          <span>{{ 'CONTRACTS.AMOUNT' | translate }}</span>
          <strong>{{ data.row.amount }}</strong>
        </div>
      </div>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'CONTRACTS.PAYMENT_DATE' | translate }}</mat-label>
        <input matInput type="date" formControlName="paymentDate" />
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CONTRACTS.PAYMENT_METHOD' | translate }}</mat-label>
          <mat-select formControlName="paymentMethod">
            <mat-option *ngFor="let method of paymentMethods" [value]="method.code">
              {{ lookupName(method) }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <label class="upload-label">{{ 'TENANT_PORTAL.ATTACH_PAYMENT_PROOF' | translate }}</label>
      <app-upload-zone
        [multiple]="true"
        [urlList]="proofUrls"
        [label]="'TENANT_PORTAL.ATTACH_PAYMENT_PROOF' | translate"
        (urlListChange)="proofUrls = $event">
      </app-upload-zone>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'COMMON.NOTES' | translate }}</mat-label>
        <textarea matInput rows="3" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">
        <mat-icon>upload_file</mat-icon>
        {{ 'TENANT_PORTAL.SUBMIT_PAYMENT_PROOF' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      width: min(620px, 86vw);
      display: grid;
      gap: 14px;
    }
    .dialog-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .dialog-summary div {
      border: 1px solid var(--line, #e5e7eb);
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--surface-2, #f8fafc);
    }
    .dialog-summary span,
    .upload-label {
      display: block;
      color: var(--text-muted, #64748b);
      font-size: 12px;
      margin-bottom: 4px;
    }
    .dialog-summary strong {
      display: block;
      font-size: 14px;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .full {
      width: 100%;
    }
    @media (max-width: 640px) {
      .row,
      .dialog-summary {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PaymentProofDialogComponent implements OnInit {
  proofUrls: string[] = this.data.row.proofUrls?.length
    ? [...this.data.row.proofUrls]
    : (this.data.row.proofUrl ? [this.data.row.proofUrl] : []);

  paymentMethods: LookupItem[] = [];

  form = this.fb.group({
    paymentDate: [this.todayIso(), Validators.required],
    paymentMethod: ['', Validators.required],
    notes: [this.data.row.proofNotes ?? '']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<PaymentProofDialogComponent, UploadPaymentProofPayload>,
    @Inject(MAT_DIALOG_DATA) readonly data: PaymentProofDialogData,
    private readonly snack: SnackService,
    private readonly i18n: I18nService,
    private readonly lookups: LookupService
  ) {}

  ngOnInit(): void {
    this.lookups.getByType('PAYMENT_METHOD').subscribe({
      next: (res) => {
        this.paymentMethods = res.data ?? [];
        const current = this.form.controls.paymentMethod.value;
        if (!current && this.paymentMethods.length) {
          this.form.controls.paymentMethod.setValue(this.paymentMethods[0].code);
        }
      },
      error: () => {
        this.paymentMethods = [];
        this.form.controls.paymentMethod.setValue('');
        this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
      }
    });
  }

  lookupName(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  submit(): void {
    if (this.form.invalid) return;
    if (!this.proofUrls.length) {
      this.snack.error(this.i18n.instant('TENANT_PORTAL.RECEIPT_FILE_REQUIRED'));
      return;
    }
    const value = this.form.getRawValue();
    this.ref.close({
      proofUrl: this.proofUrls[0],
      proofUrls: this.proofUrls,
      paymentDate: value.paymentDate ?? this.todayIso(),
      paymentMethod: value.paymentMethod ?? undefined,
      notes: value.notes?.trim() || undefined
    });
  }

  private todayIso(): string {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  }
}
