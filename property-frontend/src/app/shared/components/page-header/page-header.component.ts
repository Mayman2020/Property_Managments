import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink, Router, Event, NavigationEnd } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
        <button *ngIf="shouldShowBack" type="button" class="back-nav-btn" (click)="onBackClick()" [attr.aria-label]="'COMMON.BACK' | translate">
          <span class="material-icons back-icon">arrow_back</span>
          <span class="back-label">{{ 'COMMON.BACK' | translate }}</span>
        </button>
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
      }
      :host-context([dir='rtl']) .page-heading {
        align-items: flex-start;
      }
      :host-context([dir='ltr']) .page-heading {
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
      .back-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--accent);
        font-size: 0.84rem;
        font-weight: 600;
        padding: 0 0 10px;
        opacity: 0.85;
        transition: opacity 0.15s;
        margin-right: 8px;
      }
      :host-context([dir='ltr']) .back-nav-btn {
        margin-right: 8px;
        margin-left: 0;
      }
      :host-context([dir='rtl']) .back-nav-btn {
        margin-left: 8px;
        margin-right: 0;
      }
      .back-nav-btn:hover { opacity: 1; }
      .back-icon { font-size: 18px; }
      :host-context([dir='rtl']) .back-icon { transform: scaleX(-1); }
    `
  ]
})
export class PageHeaderComponent implements OnDestroy {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() showBack = false;
  @Output() backClick = new EventEmitter<void>();

  private previousUrl = '';
  private menuRoutes = ['/admin/home', '/admin/dashboard', '/officer/schedule', '/tenant/my-unit'];
  private sub: Subscription;

  constructor(private router: Router) {
    this.sub = this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.previousUrl = event.urlAfterRedirects;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get shouldShowBack(): boolean {
    if (!this.showBack) return false;
    if (!this.previousUrl) return false;
    const isFromMenu = this.menuRoutes.some(route => this.previousUrl.startsWith(route));
    return !isFromMenu;
  }

  onBackClick(): void {
    this.backClick.emit();
  }
}
