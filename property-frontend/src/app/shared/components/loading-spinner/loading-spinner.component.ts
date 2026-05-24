import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [AsyncPipe, NgIf, MatProgressSpinnerModule],
  template: `
    <div class="app-loading-overlay" *ngIf="loading.isLoading$ | async" aria-live="polite" aria-busy="true">
      <mat-spinner diameter="52"></mat-spinner>
    </div>
  `
})
export class LoadingSpinnerComponent {
  constructor(readonly loading: LoadingService) {}
}
