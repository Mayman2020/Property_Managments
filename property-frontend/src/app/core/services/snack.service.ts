import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackService {
  constructor(private readonly snack: MatSnackBar) {}

  success(message: string): void {
    this.snack.open(message, '✕', { duration: 3500, panelClass: ['success-snack'], horizontalPosition: 'end' });
  }

  error(message: string): void {
    this.snack.open(message, '✕', { duration: 5000, panelClass: ['error-snack'], horizontalPosition: 'end' });
  }

  info(message: string): void {
    this.snack.open(message, '✕', { duration: 3000, panelClass: ['info-snack'], horizontalPosition: 'end' });
  }
}
