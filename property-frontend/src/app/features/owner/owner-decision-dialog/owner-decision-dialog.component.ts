import { Component, Inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';

import { LeaseContract } from '../../../core/models/contract.model';
import { OwnerApprovalDecision } from '../../../core/services/accountant-portal.service';

@Component({
  selector: 'app-owner-decision-dialog',
  standalone: true,
  imports: [
    NgClass, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatRadioModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'OWNER_PORTAL.CONTRACT_DECISION' | translate }}</h2>
    <mat-dialog-content [formGroup]="form" class="content">
      <div class="contract-info">
        <strong>{{ data.contract.contractNumber }}</strong>
        <span> — {{ data.contract.tenantName }}</span>
      </div>

      <mat-radio-group formControlName="decision" class="radio-group">
        <mat-radio-button value="APPROVED" class="approve">
          ✓ {{ 'OWNER_PORTAL.APPROVE' | translate }}
        </mat-radio-button>
        <mat-radio-button value="REJECTED" class="reject">
          ✗ {{ 'OWNER_PORTAL.REJECT' | translate }}
        </mat-radio-button>
      </mat-radio-group>

      <mat-form-field appearance="outline" class="full-width" style="margin-top:16px">
        <mat-label>{{ 'COMMON.NOTES' | translate }}</mat-label>
        <textarea matInput formControlName="notes" rows="3"
          [placeholder]="'OWNER_PORTAL.NOTES_PLACEHOLDER' | translate"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button
        [color]="form.value.decision === 'APPROVED' ? 'primary' : 'warn'"
        (click)="confirm()"
        [disabled]="form.invalid">
        {{ 'COMMON.CONFIRM' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .content { min-width: 380px; }
    .contract-info { background: var(--surface-hover); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 15px; }
    .radio-group { display: flex; gap: 24px; }
    .full-width { width: 100%; }
  `]
})
export class OwnerDecisionDialogComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<OwnerDecisionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: { contract: LeaseContract }
  ) {
    this.form = this.fb.group({
      decision: ['APPROVED', Validators.required],
      notes: ['']
    });
  }

  confirm(): void {
    if (this.form.valid) {
      const payload: OwnerApprovalDecision = {
        decision: this.form.value.decision,
        notes: this.form.value.notes || undefined
      };
      this.ref.close(payload);
    }
  }
}
