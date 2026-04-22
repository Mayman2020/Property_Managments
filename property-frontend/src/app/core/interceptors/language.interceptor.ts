import { HttpInterceptorFn } from '@angular/common/http';

const STORAGE_KEY = 'pm_lang';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const saved = localStorage.getItem(STORAGE_KEY);
  const lang = (saved === 'ar' || saved === 'en') ? saved : 'ar';
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
