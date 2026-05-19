import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';

export interface ContractTypeChoiceDialogData {
  allowMaintenance?: boolean;
}

@Component({
  selector: 'app-contract-type-choice-dialog',
  standalone: true,
  imports: [
    NgIf,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">description</mat-icon>
      {{ 'CONTRACTS.SELECT_CONTRACT_TYPE' | translate }}
    </h2>

    <mat-dialog-content class="contract-type-choice-dialog-body">
      <div class="dialog-intro">
        <mat-icon>help_outline</mat-icon>
        <div>
          <strong>{{ 'CONTRACTS.SELECT_CONTRACT_TYPE' | translate }}</strong>
        </div>
      </div>

      <div class="choice-options">
        <button type="button" class="choice-card" (click)="ref.close('rental')">
          <span class="choice-icon rental">
            <mat-icon>home_work</mat-icon>
          </span>
        <span class="choice-copy">
          <strong>{{ 'CONTRACTS.RENTAL_CONTRACT' | translate }}</strong>
        </span>
          <mat-icon class="choice-arrow">{{ 'chevron_' + (documentDir === 'rtl' ? 'left' : 'right') }}</mat-icon>
        </button>

        <button *ngIf="data?.allowMaintenance !== false" type="button" class="choice-card" (click)="ref.close('maintenance')">
          <span class="choice-icon maintenance">
            <mat-icon>engineering</mat-icon>
          </span>
        <span class="choice-copy">
          <strong>{{ 'CONTRACTS.MAINTENANCE_CONTRACT' | translate }}</strong>
        </span>
          <mat-icon class="choice-arrow">{{ 'chevron_' + (documentDir === 'rtl' ? 'left' : 'right') }}</mat-icon>
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions-row">
      <button mat-stroked-button type="button" (click)="ref.close(null)">{{ 'ACTIONS.CANCEL' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .contract-type-choice-dialog-body {
      padding-top: 16px;
      min-width: min(440px, 82vw);
    }

    .dialog-intro {
      margin-bottom: 14px;
    }

    .dialog-intro p {
      margin: 3px 0 0;
      color: var(--text-muted);
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .choice-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .choice-card {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text-main);
      cursor: pointer;
      text-align: start;
      font: inherit;
      transition: background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
    }

    .choice-card:hover {
      background: var(--surface-2);
      border-color: var(--brass-300);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
      transform: translateY(-1px);
    }

    .choice-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
    }

    .choice-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .choice-icon.rental {
      background: rgba(26, 60, 94, 0.1);
      color: var(--navy-800);
    }

    .choice-icon.maintenance {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .choice-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      flex: 1;
    }

    .choice-copy strong {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .choice-copy small {
      font-size: 0.76rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .choice-arrow {
      color: var(--text-muted);
      opacity: 0.7;
    }

    .dialog-actions-row {
      padding: 16px 24px;
      border-top: 1px solid var(--line);
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      background: var(--surface-2);
    }
  `]
})
export class ContractTypeChoiceDialogComponent {
  readonly documentDir = document.documentElement.dir || 'rtl';

  constructor(
    public ref: MatDialogRef<ContractTypeChoiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContractTypeChoiceDialogData
  ) {}
}
