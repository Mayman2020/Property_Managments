import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  template: `
    <div class="loading-overlay" *ngIf="loading.isLoading$ | async">
      <div class="spinner-wrap">
        <div class="spinner"></div>
        <span class="spinner-brand">PM</span>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(26,60,94,0.18);
      backdrop-filter: blur(3px);
    }
    .spinner-wrap {
      position: relative;
      width: 64px; height: 64px;
      display: flex; align-items: center; justify-content: center;
    }
    .spinner {
      position: absolute; inset: 0;
      border-radius: 50%;
      border: 3px solid rgba(201,168,76,0.2);
      border-top-color: #C9A84C;
      animation: spin 0.8s linear infinite;
    }
    .spinner-brand {
      font-family: 'Playfair Display', serif;
      font-size: 0.75rem; font-weight: 700;
      color: #1A3C5E; letter-spacing: 1px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoadingSpinnerComponent {
  constructor(readonly loading: LoadingService) {}
}
