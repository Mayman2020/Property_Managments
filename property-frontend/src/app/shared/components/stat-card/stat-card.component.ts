import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="stat-card">
      <div class="stat-icon" [ngClass]="iconClass">
        <span class="material-icons">{{ icon }}</span>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
        <div class="stat-trend" [ngClass]="trend >= 0 ? 'up' : 'down'" *ngIf="showTrend">
          <span class="material-icons" style="font-size:14px">{{ trend >= 0 ? 'trending_up' : 'trending_down' }}</span>
          {{ Math.abs(trend) }}%
        </div>
      </div>
    </div>
  `,
  styles: [``]
})
export class StatCardComponent {
  @Input() icon = 'info';
  @Input() iconClass = '';
  @Input() value: string | number = 0;
  @Input() label = '';
  @Input() trend = 0;
  @Input() showTrend = false;

  readonly Math = Math;
}
