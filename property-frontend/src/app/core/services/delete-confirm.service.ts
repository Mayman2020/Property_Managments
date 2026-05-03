import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { I18nService } from '../i18n/i18n.service';
import { SnackService } from './snack.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

export interface OpenDeleteConfirmOptions {
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
}

@Injectable({ providedIn: 'root' })
export class DeleteConfirmService {
  private readonly dialog = inject(MatDialog);
  private readonly i18n = inject(I18nService);

  private readonly panel = { width: '440px', maxWidth: '95vw', panelClass: 'app-dialog-panel' as const };

  /** حوار تأكيد حذف موحّد */
  openDeleteConfirm(opts: OpenDeleteConfirmOptions): Observable<boolean> {
    const title = opts.title ?? this.i18n.instant(opts.titleKey ?? 'DIALOG.DELETE_TITLE');
    const message =
      opts.message ??
      (opts.messageKey
        ? this.i18n.instant(opts.messageKey, opts.messageParams ?? {})
        : this.i18n.instant('DIALOG.DELETE_GENERIC'));
    const data: ConfirmDialogData = {
      title,
      message,
      confirmLabel: this.i18n.instant('ACTIONS.DELETE'),
      cancelLabel: this.i18n.instant('ACTIONS.CANCEL'),
      danger: true
    };
    return this.dialog.open(ConfirmDialogComponent, { data, ...this.panel }).afterClosed().pipe(map(Boolean));
  }

  /** تعذّر الحذف (ارتباط أو رسالة من الخادم) */
  openDeleteBlocked(detail?: string | null): void {
    const d = (detail ?? '').trim();
    const message = d
      ? this.i18n.instant('DIALOG.DELETE_BLOCKED_WITH_DETAIL', { detail: d })
      : this.i18n.instant('DIALOG.DELETE_BLOCKED_GENERIC');
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.i18n.instant('DIALOG.DELETE_BLOCKED_TITLE'),
        message,
        alertOnly: true,
        confirmLabel: this.i18n.instant('ACTIONS.CLOSE'),
        icon: 'error'
      } satisfies ConfirmDialogData,
      ...this.panel
    });
  }

  /** بعد فشل طلب الحذف: إن كانت رسالة تشير لقيود/ارتباط نعرض حواراً؛ وإلا snack */
  handleDeleteError(err: unknown, snack: SnackService): void {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    if (!msg.trim()) {
      snack.error(this.i18n.instant('COMMON.ERROR'));
      return;
    }
    if (this.isLikelyConstraintOrLinkError(msg)) {
      this.openDeleteBlocked(msg);
    } else {
      snack.error(msg);
    }
  }

  private isLikelyConstraintOrLinkError(message: string): boolean {
    const m = message.toLowerCase();
    return (
      /constraint|foreign key|foreignkey|referenced|references|violat|cannot delete|unable to delete|linked|associated|exists|in use|409/.test(m) ||
      /مرتبط|قيود|مفتاح أجنبي|لا يمكن حذف|تعذر حذف|يُستخدم|قيد الاستخدام|استخدام/.test(message)
    );
  }
}
