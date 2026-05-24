import { TranslateService } from '@ngx-translate/core';

/** i18n keys such as COMMON.ERROR or VACANCY.AUTO_PUBLISHED */
const I18N_KEY_PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*)+$/;

/** Resolve UI text: translate known keys; leave API / already-localized text as-is. */
export function resolveUserMessage(message: string | null | undefined, translate: TranslateService): string {
  const raw = (message ?? '').trim();
  if (!raw) return raw;
  if (I18N_KEY_PATTERN.test(raw)) {
    const translated = translate.instant(raw);
    if (translated && translated !== raw) return translated;
  }
  return raw;
}
