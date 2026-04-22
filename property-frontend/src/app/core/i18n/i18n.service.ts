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
    const saved = (localStorage.getItem(STORAGE_KEY) as LangCode) || 'ar';
    this.translate.addLangs(['ar', 'en']);
    this.translate.setDefaultLang('ar');
    this.setLang(saved).subscribe();
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
    localStorage.setItem(STORAGE_KEY, lang);
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
    this.overlayContainer.getContainerElement().setAttribute('dir', lang.dir);
  }

  private updateDocumentTitle(): void {
    const title = this.translate.instant('APP.TAGLINE');
    if (title && title !== 'APP.TAGLINE') {
      document.title = title;
    }
  }
}
