import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { resolveUserMessage } from '../utils/user-message.util';

@Injectable({ providedIn: 'root' })
export class SnackService {
  constructor(
    private readonly snack: MatSnackBar,
    private readonly translate: TranslateService
  ) {}

  success(message: string): void {
    this.open(this.resolve(message), 'success-snack', 3500);
  }

  error(message: string): void {
    this.open(this.resolve(message), 'error-snack', 5000);
  }

  info(message: string): void {
    this.open(this.resolve(message), 'info-snack', 3000);
  }

  private resolve(message: string): string {
    return resolveUserMessage(message, this.translate);
  }

  private open(message: string, panelClass: string, duration: number): void {
    const action = this.translate.instant('ACTIONS.CLOSE');
    const closeLabel = action && action !== 'ACTIONS.CLOSE' ? action : '✕';
    this.snack.open(message, closeLabel, {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'end'
    });
  }
}
