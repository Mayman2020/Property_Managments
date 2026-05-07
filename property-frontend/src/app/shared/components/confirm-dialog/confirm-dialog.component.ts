import { NgClass, NgIf } from '@angular/common';
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
  /** إخفاء «إلغاء» — حوار تنبيه فقط (مثلاً تعذّر الحذف) */
  alertOnly?: boolean;
  /** أيقونة المقدمة: help | warning | error | info */
  icon?: 'help' | 'warning' | 'error' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf, NgClass, MatDialogModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.title | translate }}</h2>
    <mat-dialog-content class="dialog-body confirm-body">
      <div class="dialog-intro">
        <span class="material-icons dialog-type-icon" [ngClass]="introIconClass">{{ introIconName }}</span>
        <p class="dialog-msg">{{ data.message | translate }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="app-dialog-actions">
      <button *ngIf="!data.alertOnly" mat-stroked-button type="button" class="btn-dialog-cancel" (click)="ref.close(false)">
        {{ (data.cancelLabel || 'ACTIONS.CANCEL') | translate }}
      </button>
      <button mat-flat-button type="button" class="btn-dialog-confirm" [class.btn-dialog-danger]="data.danger && !data.alertOnly" (click)="ref.close(true)">
        {{ (data.confirmLabel || 'COMMON.CONFIRM') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .confirm-body { min-width: min(420px, 92vw); }
    .confirm-body .dialog-intro { margin-bottom: 0; display: flex; align-items: flex-start; gap: 12px; }
    .dialog-type-icon { flex-shrink: 0; font-size: 36px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
    .dialog-type-icon.is-help { color: var(--navy-800, #1a237e); background: rgba(26, 35, 126, 0.08); }
    .dialog-type-icon.is-warn { color: #e65100; background: rgba(230, 81, 0, 0.1); }
    .dialog-type-icon.is-error { color: #c62828; background: rgba(198, 40, 40, 0.1); }
    .dialog-type-icon.is-info { color: #0277bd; background: rgba(2, 119, 189, 0.1); }
    :host-context([dir='rtl']) .dialog-type-icon {
      transform: none !important;
    }
    .dialog-msg { margin: 0; flex: 1; min-width: 0; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    readonly ref: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData
  ) {}

  get introIconName(): string {
    const i = this.data.icon;
    if (i === 'error') return 'error';
    if (i === 'info') return 'info';
    if (this.data.danger) return 'warning';
    return 'help_outline';
  }

  get introIconClass(): string {
    const i = this.data.icon;
    if (i === 'error') return 'is-error';
    if (i === 'info') return 'is-info';
    if (this.data.danger) return 'is-warn';
    return 'is-help';
  }
}
