import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const lang = inject(I18nService).currentLang;
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
