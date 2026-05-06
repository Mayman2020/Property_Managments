import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * App-wide tracker for the previous URL and whether the most recent navigation
 * was triggered from the sidebar menu (vs. an in-screen click such as a row,
 * breadcrumb or programmatic router.navigate).
 *
 * The page header back button uses this to hide itself when the user enters
 * a screen directly from the menu and to show otherwise.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private _previousUrl = '';
  private _currentUrl = '';
  /** True when the most recent navigation came from a sidebar menu click. */
  private _enteredFromMenu = false;
  /** Set by sidebar before triggering router navigation; consumed by next NavigationEnd. */
  private _menuFlagPending = false;

  constructor(router: Router) {
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this._previousUrl = this._currentUrl;
        this._currentUrl = e.urlAfterRedirects;
        this._enteredFromMenu = this._menuFlagPending;
        this._menuFlagPending = false;
      });
  }

  /** Called by the sidebar before navigation; consumed on the next NavigationEnd. */
  markFromMenu(): void {
    this._menuFlagPending = true;
  }

  get previousUrl(): string {
    return this._previousUrl;
  }

  get enteredFromMenu(): boolean {
    return this._enteredFromMenu;
  }
}
