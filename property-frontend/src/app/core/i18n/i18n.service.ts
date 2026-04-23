import { Injectable } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export type LangCode = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface LanguageOption {
  code: LangCode;
  label: string;
  nativeLabel: string;
  dir: Direction;
  flagUrl: string;
}

const STORAGE_KEY = 'pm_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages: LanguageOption[] = [
    { code: 'ar', label: 'Arabic (Oman)', nativeLabel: 'العربية (سلطنة عُمان)', dir: 'rtl', flagUrl: 'assets/flags/om.svg' },
    { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', flagUrl: 'assets/flags/gb.svg' }
  ];

  constructor(
    private readonly translate: TranslateService,
    private readonly overlayContainer: OverlayContainer
  ) {
    const saved = this.readSavedLanguage();
    this.translate.addLangs(['ar', 'en']);
    this.translate.setDefaultLang('ar');
    this.setLang(saved).subscribe({
      error: () => {
        // Avoid blocking bootstrap when translation files are temporarily unavailable.
      }
    });
  }

  get currentLang(): LangCode {
    return (this.translate.currentLang as LangCode) || 'ar';
  }

  get currentDirection(): Direction {
    return this.languages.find((l) => l.code === this.currentLang)?.dir ?? 'rtl';
  }

  get isRtl(): boolean {
    return this.currentDirection === 'rtl';
  }

  setLang(code: LangCode): Observable<unknown> {
    const lang = this.languages.find((l) => l.code === code) ? code : 'ar';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage write failures and continue with in-memory language state.
    }
    this.applyLang(lang);
    return this.translate.use(lang).pipe(
      tap(() => this.updateDocumentTitle())
    );
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private applyLang(code: LangCode): void {
    const lang = this.languages.find((l) => l.code === code) ?? this.languages[0];
    const htmlLang = code === 'ar' ? 'ar-OM' : 'en';

    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', htmlLang);
    document.body.setAttribute('dir', lang.dir);
    try {
      this.overlayContainer.getContainerElement().setAttribute('dir', lang.dir);
    } catch {
      // Overlay container can be unavailable during early bootstrap; safe to ignore.
    }
  }

  private updateDocumentTitle(): void {
    const title = this.translate.instant('APP.TAGLINE');
    if (title && title !== 'APP.TAGLINE') {
      document.title = title;
    }
  }

  private readSavedLanguage(): LangCode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {
      // Ignore storage read failures and fallback to default language.
    }
    return 'ar';
  }
}
