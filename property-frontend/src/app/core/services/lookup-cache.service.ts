import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, shareReplay, tap, map } from 'rxjs';
import { LookupService, LookupItem, LookupType } from './lookup.service';
import { I18nService } from '../i18n/i18n.service';

@Injectable({ providedIn: 'root' })
export class LookupCacheService {
  private readonly cache = new Map<LookupType, LookupItem[]>();
  private readonly inflight = new Map<LookupType, Observable<LookupItem[]>>();

  constructor(
    private readonly lookupSvc: LookupService,
    private readonly i18n: I18nService
  ) {}

  /** Pre-load one or more lookup types. Subscribe before reading items()/label(). */
  preload(...types: LookupType[]): Observable<void> {
    const missing = types.filter(t => !this.cache.has(t));
    if (!missing.length) return of(undefined);
    return forkJoin(Object.fromEntries(missing.map(t => [t, this.load(t)]))).pipe(
      map(() => undefined)
    );
  }

  /** Get cached items (call after preload completes). */
  items(type: LookupType): LookupItem[] {
    return this.cache.get(type) ?? [];
  }

  /** Resolve a code to its localised display name (call after preload completes). */
  label(type: LookupType, code: string | null | undefined): string {
    if (!code) return '';
    const item = this.cache.get(type)?.find(i => i.code === code);
    if (!item) return this.isBadDisplayText(code) ? '' : code;
    const preferred = this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
    const fallback = this.i18n.currentLang === 'ar' ? item.nameEn : item.nameAr;
    return this.cleanDisplayText(preferred) || this.cleanDisplayText(fallback) || '';
  }

  cleanDisplayText(value: string | null | undefined): string {
    const normalized = (value ?? '').trim();
    return this.isBadDisplayText(normalized) ? '' : normalized;
  }

  private isBadDisplayText(value: string | null | undefined): boolean {
    const normalized = (value ?? '').trim();
    return !normalized || /^[?\s]+$/.test(normalized) || /Ø|Ù|Â/.test(normalized);
  }

  private load(type: LookupType): Observable<LookupItem[]> {
    if (this.cache.has(type)) return of(this.cache.get(type)!);
    if (!this.inflight.has(type)) {
      const obs = this.lookupSvc.getByType(type).pipe(
        map(res => res.data ?? []),
        tap(items => { this.cache.set(type, items); this.inflight.delete(type); }),
        shareReplay(1)
      );
      this.inflight.set(type, obs);
    }
    return this.inflight.get(type)!;
  }
}
