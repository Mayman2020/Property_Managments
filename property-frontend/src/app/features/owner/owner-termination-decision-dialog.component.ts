import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface OwnerTerminationDecisionDialogData {
  contractId: number;
  contractNumber: string;
  decision: 'APPROVED' | 'REJECTED';
  terminationDate?: string;
  terminationReason?: string;
}

export interface OwnerTerminationDecisionDialogResult {
  decision: 'APPROVED' | 'REJECTED';
  notes: string;
}

@Component({
  selector: 'app-owner-termination-decision-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.decision === 'APPROVED'
            ? 'OWNER_PORTAL.TERMINATION_DECISION_APPROVE_TITLE'
            : 'OWNER_PORTAL.TERMINATION_DECISION_REJECT_TITLE') | translate }}
    </h2>
    <mat-dialog-content>
      <p class="muted">
        {{ data.contractNumber }}
        <span *ngIf="data.terminationDate"> — {{ data.terminationDate }}</span>
      </p>
      <p class="reason" *ngIf="data.terminationReason">{{ data.terminationReason }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'OWNER_PORTAL.TERMINATION_DECISION_NOTES' | translate }}</mat-label>
        <textarea matInput rows="4" [formControl]="form.controls.notes"
                  [required]="data.decision === 'REJECTED'"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button [color]="data.decision === 'APPROVED' ? 'primary' : 'warn'"
              type="button" (click)="submit()" [disabled]="form.invalid">
        {{ (data.decision === 'APPROVED'
              ? 'OWNER_PORTAL.TERMINATION_DECISION_APPROVE_CTA'
              : 'OWNER_PORTAL.TERMINATION_DECISION_REJECT_CTA') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .muted { color: #666; font-size: 13px; margin: 0 0 4px; }
    .reason { margin: 0 0 12px; font-size: 13px; color: #475569; white-space: pre-wrap; }
  `]
})
export class OwnerTerminationDecisionDialogComponent {
  form = this.fb.group({ notes: [''] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<OwnerTerminationDecisionDialogComponent, OwnerTerminationDecisionDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OwnerTerminationDecisionDialogData
  ) {
    if (this.data.decision === 'REJECTED') {
      this.form.controls.notes.addValidators([Validators.required, Validators.minLength(5)]);
      this.form.controls.notes.updateValueAndValidity();
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.ref.close({
      decision: this.data.decision,
      notes: (this.form.value.notes ?? '').trim()
    });
  }
}
