import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface OwnerDecisionDetailRow {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'success';
}

export interface OwnerTerminationDecisionDialogData {
  contractId: number;
  contractNumber: string;
  decision: 'APPROVED' | 'REJECTED';
  title?: string;
  subtitle?: string;
  noticeLabel?: string;
  terminationDate?: string;
  terminationReason?: string;
  details?: OwnerDecisionDetailRow[];
  propertyDetailsTitle?: string;
  propertyDetails?: OwnerDecisionDetailRow[];
  impactWarning?: string;
  showSettlement?: boolean;
  settlementLabel?: string;
}

export interface OwnerTerminationDecisionDialogResult {
  decision: 'APPROVED' | 'REJECTED';
  notes: string;
  settlementAmount?: number | null;
}

@Component({
  selector: 'app-owner-termination-decision-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, DialogTitleCloseDirective],
  template: `
    <div class="dialog-shell">
      <header class="dialog-hero" mat-dialog-title>
        <div class="hero-icon">
          <mat-icon>{{ data.decision === 'APPROVED' ? 'cancel_schedule_send' : 'do_not_disturb_on' }}</mat-icon>
        </div>
        <div>
          <span class="notice-label">{{ data.noticeLabel || data.contractNumber }}</span>
          <h2>
            {{ data.title || ((data.decision === 'APPROVED'
                  ? 'OWNER_PORTAL.TERMINATION_DECISION_APPROVE_TITLE'
                  : 'OWNER_PORTAL.TERMINATION_DECISION_REJECT_TITLE') | translate) }}
          </h2>
          <p *ngIf="data.subtitle">{{ data.subtitle }}</p>
        </div>
      </header>

      <mat-dialog-content>
        <section class="summary-card">
          <div class="summary-line">
            <span class="eyebrow">{{ data.contractNumber }}</span>
            <strong *ngIf="data.terminationDate">
              <mat-icon>event_busy</mat-icon>
              {{ data.terminationDate }}
            </strong>
          </div>
          <p class="reason" *ngIf="data.terminationReason">{{ data.terminationReason }}</p>
        </section>

        <section class="property-card" *ngIf="data.propertyDetails?.length">
          <div class="property-card-title">
            <mat-icon>apartment</mat-icon>
            <span>{{ data.propertyDetailsTitle || 'Property details' }}</span>
          </div>
          <div class="property-grid">
            <div class="property-cell" *ngFor="let item of data.propertyDetails">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
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

        <mat-form-field *ngIf="data.showSettlement" appearance="outline" class="full">
          <mat-label>{{ data.settlementLabel || 'Settlement Amount' }}</mat-label>
          <input matInput type="number" min="0" step="0.001" [formControl]="form.controls.settlementAmount">
        </mat-form-field>

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
    </div>
  `,
  styles: [`
    :host { display: block; min-width: min(760px, 92vw); }
    .dialog-shell { overflow: hidden; border-radius: 8px; background: #fffdf8; }
    .dialog-hero {
      margin: 0;
      padding: 22px 28px;
      background: linear-gradient(135deg, #0b2036 0%, #163a5c 100%);
      color: #f7e7bd;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .hero-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: rgba(247, 231, 189, 0.14);
      border: 1px solid rgba(247, 231, 189, 0.28);
      flex: 0 0 auto;
    }
    .hero-icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .notice-label {
      display: block;
      color: #d8c58f;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    h2 {
      margin: 0;
      color: #fff7df;
      font-size: 21px;
      font-weight: 900;
      line-height: 1.35;
    }
    .dialog-hero p {
      margin: 5px 0 0;
      color: rgba(255, 247, 223, 0.82);
      font-size: 13px;
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
      border-radius: 8px;
      padding: 14px 16px;
      background: #fffaf1;
    }
    .summary-line { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .eyebrow { color: #5c6f86; font-size: 13px; font-weight: 700; }
    .summary-card strong { display: inline-flex; align-items: center; gap: 6px; color: #0f2237; font-size: 15px; }
    .summary-card mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .reason { margin: 10px 0 0; font-size: 14px; color: #475569; white-space: pre-wrap; word-break: break-word; }
    .property-card {
      border: 1px solid #d7c28b;
      border-radius: 8px;
      background: #fff8e5;
      padding: 14px;
    }
    .property-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #7c520b;
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 12px;
    }
    .property-card-title mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .property-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .property-cell {
      background: #fffdf8;
      border: 1px solid #eadcaf;
      border-radius: 8px;
      padding: 10px 12px;
      min-width: 0;
    }
    .property-cell span { display: block; color: #8a6a2a; font-size: 11px; font-weight: 700; margin-bottom: 5px; }
    .property-cell strong { display: block; color: #10253a; font-size: 15px; overflow-wrap: anywhere; }
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
      .details-grid, .property-grid { grid-template-columns: 1fr; }
      .dialog-hero, mat-dialog-content, mat-dialog-actions { padding-inline: 18px !important; }
      h2 { font-size: 18px; }
    }
  `]
})
export class OwnerTerminationDecisionDialogComponent {
  form = this.fb.group({
    notes: [''],
    settlementAmount: [null as number | null]
  });

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
      notes: (this.form.value.notes ?? '').trim(),
      settlementAmount: this.data.showSettlement ? (this.form.value.settlementAmount ?? null) : null
    });
  }
}
