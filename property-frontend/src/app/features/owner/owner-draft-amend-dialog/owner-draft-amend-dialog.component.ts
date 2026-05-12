import { Component, Inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { DraftUnitOption, OwnerPortalService } from '../../../core/services/owner-portal.service';

export interface OwnerDraftAmendDialogData {
  contractId: number;
  contractNumber: string;
  currentUnitId: number;
  currentRent: number;
}

@Component({
  selector: 'app-owner-draft-amend-dialog',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'OWNER_PORTAL.AMEND_DRAFT_TITLE' | translate }}</h2>
    <mat-dialog-content>
      <p class="muted">{{ data.contractNumber }}</p>
      <p class="hint">{{ 'OWNER_PORTAL.AMEND_DRAFT_HINT' | translate }}</p>

      <div class="opts-loading" *ngIf="loadingOptions">
        <mat-spinner diameter="36"></mat-spinner>
      </div>

      <p class="warn" *ngIf="!loadingOptions && optionsError">{{ 'OWNER_PORTAL.UNIT_OPTIONS_ERROR' | translate }}</p>
      <p class="muted small" *ngIf="!loadingOptions && !optionsError && unitOptions.length === 0">
        {{ 'OWNER_PORTAL.NO_UNIT_OPTIONS' | translate }}
      </p>

      <mat-form-field appearance="outline" class="full" *ngIf="!loadingOptions">
        <mat-label>{{ 'OWNER_PORTAL.SELECT_UNIT' | translate }}</mat-label>
        <mat-select [formControl]="form.controls.unitId">
          <mat-option [value]="null">{{ 'OWNER_PORTAL.KEEP_CURRENT_UNIT' | translate }}</mat-option>
          <mat-option *ngFor="let u of unitOptions" [value]="u.id">
            {{ unitLabel(u) }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'OWNER_PORTAL.NEW_MONTHLY_RENT' | translate }}</mat-label>
        <input matInput type="number" [formControl]="form.controls.monthlyRent" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'OWNER_PORTAL.AMEND_REASON' | translate }}</mat-label>
        <textarea matInput rows="3" [formControl]="form.controls.reason"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">{{ 'COMMON.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || !hasChange()">
        {{ 'COMMON.SAVE' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .muted { color: #666; font-size: 13px; margin: 0 0 8px; }
    .muted.small { font-size: 12px; }
    .hint { font-size: 12px; color: #555; margin: 0 0 12px; }
    .warn { color: #c62828; font-size: 13px; margin: 0 0 8px; }
    .opts-loading { display: flex; justify-content: center; padding: 16px 0; }
  `]
})
export class OwnerDraftAmendDialogComponent implements OnInit {
  unitOptions: DraftUnitOption[] = [];
  loadingOptions = true;
  optionsError = false;

  form = this.fb.group({
    unitId: [null as number | null],
    monthlyRent: [null as number | null],
    reason: ['', [Validators.required, Validators.minLength(5)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly ownerPortal: OwnerPortalService,
    private readonly ref: MatDialogRef<OwnerDraftAmendDialogComponent, { unitId?: number; monthlyRent?: number; reason: string } | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: OwnerDraftAmendDialogData
  ) {}

  ngOnInit(): void {
    this.ownerPortal.getDraftAmendUnitOptions(this.data.contractId).subscribe({
      next: (res) => {
        this.unitOptions = res.data ?? [];
        this.loadingOptions = false;
      },
      error: () => {
        this.optionsError = true;
        this.loadingOptions = false;
      }
    });
  }

  unitLabel(u: DraftUnitOption): string {
    const prop = u.propertyName?.trim() || '';
    const num = u.unitNumber?.trim() || String(u.id);
    return prop ? `${prop} — ${num}` : num;
  }

  hasChange(): boolean {
    const u = this.form.value.unitId;
    const r = this.form.value.monthlyRent;
    const unitCh = u != null && Number(u) !== this.data.currentUnitId;
    const rentCh = r != null && Number(r) !== this.data.currentRent;
    return unitCh || rentCh;
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const unitId = v.unitId != null && v.unitId !== this.data.currentUnitId ? v.unitId : undefined;
    const monthlyRent = v.monthlyRent != null && Number(v.monthlyRent) !== this.data.currentRent ? Number(v.monthlyRent) : undefined;
    if (unitId == null && monthlyRent == null) {
      return;
    }
    this.ref.close({
      unitId,
      monthlyRent,
      reason: v.reason!.trim()
    });
  }
}
