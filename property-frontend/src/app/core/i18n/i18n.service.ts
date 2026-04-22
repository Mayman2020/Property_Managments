import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export type LangCode = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface LanguageOption {
  code: LangCode;
  label: string;
  nativeLabel: string;
  dir: Direction;
  flag: string;
}

const STORAGE_KEY = 'pm_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages: LanguageOption[] = [
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', flag: '🇸🇦' },
    { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', flag: '🇬🇧' }
  ];

  constructor(private readonly translate: TranslateService) {
    const saved = (localStorage.getItem(STORAGE_KEY) as LangCode) || 'ar';
    this.translate.addLangs(['ar', 'en']);
    this.translate.setDefaultLang('ar');
    this.applyLang(saved);
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
    localStorage.setItem(STORAGE_KEY, code);
    this.applyLang(code);
    return this.translate.use(code);
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private applyLang(code: LangCode): void {
    const lang = this.languages.find((l) => l.code === code) ?? this.languages[0];
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', code);
    this.translate.use(code);
  }
}
