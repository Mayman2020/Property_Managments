import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink],
  template: `
    <div class="app-page-header">
      <div class="page-heading">
        <nav class="app-breadcrumb" *ngIf="breadcrumbs.length">
          <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
            <a *ngIf="!last && crumb.route" [routerLink]="crumb.route">{{ crumb.label }}</a>
            <span *ngIf="!last && !crumb.route">{{ crumb.label }}</span>
            <span class="sep" *ngIf="!last">/</span>
            <span class="current" *ngIf="last">{{ crumb.label }}</span>
          </ng-container>
        </nav>
        <div class="app-page-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</div>
        <h1 class="app-page-title">{{ title }}</h1>
        <p class="app-page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .page-heading { min-width: 0; }
      .app-page-eyebrow {
        font-size: 11px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .page-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    `
  ]
})
export class PageHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
}
