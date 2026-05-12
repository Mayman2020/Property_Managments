import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface OwnerRenewalDecisionDialogData {
  contractId: number;
  contractNumber: string;
  decision: 'APPROVED' | 'REJECTED';
}

export interface OwnerRenewalDecisionDialogResult {
  decision: 'APPROVED' | 'REJECTED';
  notes: string;
}

@Component({
  selector: 'app-owner-renewal-decision-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.decision === 'APPROVED'
            ? 'OWNER_PORTAL.RENEWAL_DECISION.TITLE_APPROVE'
            : 'OWNER_PORTAL.RENEWAL_DECISION.TITLE_REJECT') | translate }}
    </h2>
    <mat-dialog-content>
      <p class="muted">{{ data.contractNumber }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'OWNER_PORTAL.RENEWAL_DECISION.NOTES' | translate }}</mat-label>
        <textarea matInput rows="4" [formControl]="form.controls.notes"></textarea>
        <mat-error *ngIf="form.controls.notes.hasError('required')">
          {{ 'OWNER_PORTAL.RENEWAL_DECISION.NOTES_REQUIRED' | translate }}
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">
        {{ 'OWNER_PORTAL.RENEWAL_DECISION.CANCEL' | translate }}
      </button>
      <button mat-flat-button [color]="data.decision === 'APPROVED' ? 'primary' : 'warn'"
              type="button" (click)="submit()" [disabled]="form.invalid">
        {{ (data.decision === 'APPROVED'
              ? 'OWNER_PORTAL.RENEWAL_DECISION.CONFIRM_APPROVE'
              : 'OWNER_PORTAL.RENEWAL_DECISION.CONFIRM_REJECT') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .muted { color: #666; font-size: 13px; margin: 0 0 8px; }
  `]
})
export class OwnerRenewalDecisionDialogComponent {
  form = this.fb.group({ notes: [''] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<OwnerRenewalDecisionDialogComponent, OwnerRenewalDecisionDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OwnerRenewalDecisionDialogData
  ) {
    if (this.data.decision === 'REJECTED') {
      this.form.controls.notes.addValidators([Validators.required, Validators.minLength(3)]);
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
