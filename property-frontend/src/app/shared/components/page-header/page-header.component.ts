import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Location, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationHistoryService } from '../../../core/services/navigation-history.service';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, TranslateModule],
  template: `
    <header class="app-page-header" role="banner">
      <div class="page-heading">
        <nav
          class="app-breadcrumb"
          *ngIf="breadcrumbs.length"
          [attr.aria-label]="'PAGE.BREADCRUMB_LABEL' | translate">
          <ng-container *ngFor="let crumb of breadcrumbs; let last = last">
            <a *ngIf="!last && crumb.route" [routerLink]="crumb.route">{{ crumb.label }}</a>
            <span *ngIf="!last && !crumb.route">{{ crumb.label }}</span>
            <span class="sep" *ngIf="!last" aria-hidden="true">/</span>
            <span class="current" *ngIf="last">{{ crumb.label }}</span>
          </ng-container>
        </nav>
        <p class="app-page-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</p>
        <h1 class="app-page-title">{{ title }}</h1>
        <p class="app-page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-actions">
        <ng-content></ng-content>
        <button
          *ngIf="shouldShowBack"
          type="button"
          class="app-back-btn"
          (click)="onBackClick()"
          [attr.aria-label]="'COMMON.BACK' | translate"
          [attr.title]="'COMMON.BACK' | translate">
          <span class="material-icons back-icon">arrow_back</span>
          <span>{{ 'COMMON.BACK' | translate }}</span>
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-heading {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .app-page-eyebrow {
        font-size: 11px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-weight: 600;
        margin: 0 0 10px;
      }
      .page-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      :host-context([dir='rtl']) .app-page-eyebrow {
        text-transform: none;
        letter-spacing: 0.04em;
      }
    `
  ]
})
export class PageHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() showBack = false;
  @Output() backClick = new EventEmitter<void>();

  constructor(
    private readonly navHistory: NavigationHistoryService,
    private readonly location: Location
  ) {}

  /** Show only when caller opted in, there is a real previous page, and the
   * user did NOT just open this page from the sidebar menu. */
  get shouldShowBack(): boolean {
    if (!this.showBack) return false;
    if (this.navHistory.enteredFromMenu) return false;
    return !!this.navHistory.previousUrl;
  }

  onBackClick(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
      return;
    }
    this.location.back();
  }
}
