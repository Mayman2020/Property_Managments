import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-table-entity-cell',
  standalone: true,
  imports: [NgIf, MatIconModule],
  template: `
    <div class="table-entity-cell">
      <img *ngIf="imageUrl" [src]="imageUrl" class="table-entity-avatar" alt="">
      <span class="table-entity-initial" *ngIf="!imageUrl && initial">{{ initial }}</span>
      <span class="table-entity-icon-wrap" *ngIf="!imageUrl && !initial && icon">
        <mat-icon class="table-entity-icon">{{ icon }}</mat-icon>
      </span>
      <div class="table-entity-copy">
        <strong>{{ title }}</strong>
        <span class="table-entity-subtitle" *ngIf="subtitle">{{ subtitle }}</span>
      </div>
    </div>
  `
})
export class TableEntityCellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() imageUrl?: string | null;
  @Input() initial?: string;
  @Input() icon?: string;
}
