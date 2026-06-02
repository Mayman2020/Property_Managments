import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { ContractService } from '../../../core/services/contract.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface CancelDraftContractDialogData {
  contractId: number;
}

@Component({
  selector: 'app-cancel-draft-contract-dialog',
  standalone: true,
  imports: [
    NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatIconModule, TranslateModule, DialogTitleCloseDirective],
  template: `
    <h2 mat-dialog-title>{{ 'CONTRACTS.CANCEL_DRAFT_TITLE' | translate }}</h2>
    <mat-dialog-content class="dialog-body confirm-body">
      <div class="dialog-intro">
        <span class="material-icons dialog-type-icon is-warn">warning</span>
        <div class="intro-stack">
          <p class="dialog-msg">{{ 'CONTRACTS.REJECT_DRAFT_CONFIRM_MSG' | translate }}</p>
          <p class="hint">{{ 'CONTRACTS.CANCEL_DRAFT_HINT' | translate }}</p>
          <form [formGroup]="form">
            <mat-form-field appearance="outline" class="full">
              <mat-label>{{ 'CONTRACTS.REJECT_REASON_DETAIL' | translate }}</mat-label>
              <textarea matInput rows="3" formControlName="reason"></textarea>
              <mat-hint>{{ 'CONTRACTS.REJECT_REASON_MIN' | translate }}</mat-hint>
            </mat-form-field>
          </form>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="app-dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)" [disabled]="saving">
        {{ 'ACTIONS.CANCEL' | translate }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm btn-dialog-danger" (click)="submit()" [disabled]="saving || form.invalid">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span *ngIf="!saving">{{ 'CONTRACTS.CONFIRM_REJECT' | translate }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-body { min-width: min(420px, 92vw); }
    .dialog-intro { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 0; }
    .dialog-type-icon {
      flex-shrink: 0; font-size: 36px; width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center; border-radius: 8px;
    }
    .dialog-type-icon.is-warn { color: #e65100; background: rgba(230, 81, 0, 0.1); }
    .intro-stack { flex: 1; min-width: 0; }
    .dialog-msg { margin: 0 0 8px; line-height: 1.45; font-weight: 600; color: var(--text-main); }
    .hint { margin: 0 0 12px; font-size: 0.88rem; color: var(--text-muted); line-height: 1.4; }
    .full { width: 100%; }
  `]
})
export class CancelDraftContractDialogComponent {
  saving = false;
  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly ref: MatDialogRef<CancelDraftContractDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: CancelDraftContractDialogData,
    private readonly contractSvc: ContractService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {}

  submit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const reason = (this.form.getRawValue().reason ?? '').trim();
    this.contractSvc.cancelDraft(this.data.contractId, reason).subscribe({
      next: () => {
        this.saving = false;
        this.ref.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.snack.error(err?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }
}
