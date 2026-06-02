import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { OwnerDecisionDetailRow } from '../owner-termination-decision-dialog/owner-termination-decision-dialog.component';

export interface OwnerRenewalDecisionDialogData {
  contractId: number;
  contractNumber: string;
  decision: 'APPROVED' | 'REJECTED';
  details?: OwnerDecisionDetailRow[];
  impactWarning?: string;
}

export interface OwnerRenewalDecisionDialogResult {
  decision: 'APPROVED' | 'REJECTED';
  notes: string;
}

@Component({
  selector: 'app-owner-renewal-decision-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, DialogTitleCloseDirective],
  template: `
    <div class="dialog-shell">
      <h2 mat-dialog-title>
        {{ (data.decision === 'APPROVED'
              ? 'OWNER_PORTAL.RENEWAL_DECISION.TITLE_APPROVE'
              : 'OWNER_PORTAL.RENEWAL_DECISION.TITLE_REJECT') | translate }}
      </h2>

      <mat-dialog-content>
        <section class="summary-card">
          <span class="eyebrow">{{ data.contractNumber }}</span>
        </section>

        <section class="details-grid" *ngIf="data.details?.length">
          <div class="detail-cell" *ngFor="let item of data.details"
               [class.warn]="item.tone === 'warn'"
               [class.success]="item.tone === 'success'">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </section>

        <div class="impact-warning" *ngIf="data.impactWarning">
          {{ data.impactWarning }}
        </div>

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
    </div>
  `,
  styles: [`
    :host { display: block; min-width: min(760px, 92vw); }
    .dialog-shell { overflow: hidden; border-radius: 12px; }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 22px 28px;
      background: #0b2036;
      color: #f7e7bd;
      font-size: 20px;
      font-weight: 800;
    }
    mat-dialog-content {
      display: grid;
      gap: 16px;
      padding: 22px 28px 8px !important;
      max-height: 70vh;
    }
    .full { width: 100%; }
    .summary-card {
      border: 1px solid #e3d7bf;
      border-radius: 10px;
      padding: 14px 16px;
      background: #fffaf1;
    }
    .eyebrow { color: #5c6f86; font-size: 13px; font-weight: 700; }
    .details-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .detail-cell {
      border: 1px solid #e5dece;
      border-radius: 8px;
      padding: 12px 14px;
      background: #fffdf8;
      min-width: 0;
    }
    .detail-cell span { display: block; color: #64748b; font-size: 12px; margin-bottom: 5px; }
    .detail-cell strong { display: block; color: #0f2237; font-size: 14px; overflow-wrap: anywhere; }
    .detail-cell.warn { border-color: #f0b45d; background: #fff7e8; }
    .detail-cell.warn strong { color: #9a5b00; }
    .detail-cell.success { border-color: #9bd6b8; background: #f0fff6; }
    .detail-cell.success strong { color: #047857; }
    .impact-warning {
      border: 1px solid #f0b45d;
      background: #fff7e8;
      color: #835000;
      border-radius: 8px;
      padding: 12px 14px;
      font-weight: 700;
    }
    mat-dialog-actions { padding: 14px 28px 22px !important; gap: 10px; }
    @media (max-width: 680px) {
      :host { min-width: 0; }
      .details-grid { grid-template-columns: 1fr; }
      h2[mat-dialog-title], mat-dialog-content, mat-dialog-actions { padding-inline: 18px !important; }
    }
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
