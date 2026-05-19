import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export type MaintenanceContractAction = 'termination' | 'renewal';

export interface MaintenanceContractActionDialogData {
  action: MaintenanceContractAction;
  contractNumber: string;
  currentEndDate?: string | null;
  currentValue?: number | null;
}

export interface MaintenanceContractActionDialogResult {
  terminationDate?: string;
  reason?: string;
  proposedStartDate?: string;
  proposedEndDate?: string;
  proposedValue?: number;
  note?: string;
}

function toYmd(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-maintenance-contract-action-dialog',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ titleKey | translate }}
    </h2>

    <mat-dialog-content class="dialog-body">
      <div class="dialog-intro">
        <span class="material-icons">{{ data.action === 'renewal' ? 'autorenew' : 'cancel_schedule_send' }}</span>
        <div>
          <strong>{{ data.contractNumber }}</strong>
          <p>{{ hintKey | translate }}</p>
        </div>
      </div>

      <form [formGroup]="form" class="action-form">
        <ng-container *ngIf="data.action === 'termination'; else renewalFields">
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'CONTRACTS.TERMINATION_DATE' | translate }}</mat-label>
            <input matInput [matDatepicker]="terminationPicker" formControlName="terminationDate">
            <mat-datepicker-toggle matIconSuffix [for]="terminationPicker"></mat-datepicker-toggle>
            <mat-datepicker #terminationPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'CONTRACTS.TERMINATION_REASON' | translate }}</mat-label>
            <textarea matInput rows="4" formControlName="reason"></textarea>
            <mat-hint>{{ 'CONTRACTS.TERMINATION_REASON_HINT' | translate }}</mat-hint>
          </mat-form-field>
        </ng-container>

        <ng-template #renewalFields>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'CONTRACT.RENEWAL.PENDING_BANNER.PROPOSED_START_DATE' | translate }}</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="proposedStartDate">
              <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'CONTRACT.RENEWAL.PENDING_BANNER.PROPOSED_END_DATE' | translate }}</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="proposedEndDate">
              <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'CONTRACTS.CONTRACT_VALUE' | translate }}</mat-label>
            <input matInput type="number" min="0" step="0.01" formControlName="proposedValue">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'COMMON.NOTES' | translate }}</mat-label>
            <textarea matInput rows="3" formControlName="note"></textarea>
          </mat-form-field>
        </ng-template>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="ref.close(null)">
        {{ 'ACTIONS.CANCEL' | translate }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" (click)="submit()" [disabled]="form.invalid">
        {{ submitKey | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body { min-width: min(560px, 94vw); padding-top: 12px; }
    .action-form { display: flex; flex-direction: column; gap: 12px; }
    .full { width: 100%; }
    .form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      background: var(--surface-2);
      gap: 10px;
    }
    @media (max-width: 560px) { .form-row { grid-template-columns: 1fr; } }
  `]
})
export class MaintenanceContractActionDialogComponent {
  readonly form = this.fb.group({
    terminationDate: [null as Date | null],
    reason: [''],
    proposedStartDate: [null as Date | null],
    proposedEndDate: [null as Date | null],
    proposedValue: [this.data.currentValue ?? null as number | null],
    note: ['']
  });

  get titleKey(): string {
    return this.data.action === 'renewal'
      ? 'MAINTENANCE_CONTRACT.REQUEST_RENEWAL_TITLE'
      : 'MAINTENANCE_CONTRACT.REQUEST_TERMINATION_TITLE';
  }

  get hintKey(): string {
    return this.data.action === 'renewal'
      ? 'MAINTENANCE_CONTRACT.REQUEST_RENEWAL_HINT'
      : 'MAINTENANCE_CONTRACT.REQUEST_TERMINATION_HINT';
  }

  get submitKey(): string {
    return this.data.action === 'renewal'
      ? 'MAINTENANCE_CONTRACT.REQUEST_RENEWAL_SUBMIT'
      : 'MAINTENANCE_CONTRACT.REQUEST_TERMINATION_SUBMIT';
  }

  constructor(
    private readonly fb: FormBuilder,
    readonly ref: MatDialogRef<MaintenanceContractActionDialogComponent, MaintenanceContractActionDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: MaintenanceContractActionDialogData
  ) {
    if (data.action === 'termination') {
      this.form.controls.terminationDate.addValidators(Validators.required);
      this.form.controls.reason.addValidators([Validators.required, Validators.minLength(3)]);
    } else {
      this.form.controls.proposedStartDate.addValidators(Validators.required);
      this.form.controls.proposedEndDate.addValidators(Validators.required);
      this.form.controls.proposedValue.addValidators([Validators.required, Validators.min(0)]);
    }
    this.form.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (this.data.action === 'termination') {
      this.ref.close({
        terminationDate: toYmd(value.terminationDate),
        reason: (value.reason ?? '').trim()
      });
      return;
    }
    this.ref.close({
      proposedStartDate: toYmd(value.proposedStartDate),
      proposedEndDate: toYmd(value.proposedEndDate),
      proposedValue: value.proposedValue == null ? undefined : Number(value.proposedValue),
      note: (value.note ?? '').trim()
    });
  }
}
