import { Injectable } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'pm_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly subject = new BehaviorSubject<ThemeMode>(this.readInitialTheme());

  readonly isDark$: Observable<boolean> = this.subject.pipe(map((m) => m === 'dark'), distinctUntilChanged());
  readonly mode$: Observable<ThemeMode> = this.subject.pipe(distinctUntilChanged());

  constructor(private readonly overlayContainer: OverlayContainer) {
    this.applyTheme(this.subject.value);
  }

  get isDark(): boolean { return this.subject.value === 'dark'; }
  get mode(): ThemeMode { return this.subject.value; }

  toggle(): void { this.setTheme(this.subject.value === 'dark' ? 'light' : 'dark'); }

  setTheme(mode: ThemeMode): void {
    this.subject.next(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage issues (private mode / blocked storage).
    }
    this.applyTheme(mode);
  }

  private readInitialTheme(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Fallback to system preference when storage is unavailable.
    }
    return window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    let overlay: HTMLElement | null = null;
    try {
      overlay = this.overlayContainer.getContainerElement();
    } catch {
      // Overlay container can fail during very early bootstrap in some browser states.
      overlay = null;
    }

    if (mode === 'dark') {
      el.classList.add('dark-theme');
      overlay?.classList.add('dark-theme');
    } else {
      el.classList.remove('dark-theme');
      overlay?.classList.remove('dark-theme');
    }
  }
}
