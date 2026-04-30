import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="dialog-body confirm-body">
      <div class="dialog-intro">
        <span class="material-icons">{{ data.danger ? 'warning' : 'help' }}</span>
        <div>
          <strong>{{ data.title }}</strong>
          <p>{{ data.message }}</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="app-dialog-actions">
      <button mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ data.cancelLabel || ('ACTIONS.CANCEL' | translate) }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" [class.btn-dialog-danger]="data.danger" (click)="ref.close(true)">
        {{ data.confirmLabel || ('ACTIONS.SAVE' | translate) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-body { min-width: min(420px, 92vw); }
    .confirm-body .dialog-intro { margin-bottom: 0; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    readonly ref: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData
  ) {}
}
