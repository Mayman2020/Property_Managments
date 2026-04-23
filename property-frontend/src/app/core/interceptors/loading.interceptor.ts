import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Keep full-screen loader for user-triggered/mutating requests only.
  // Background GETs (dashboard cards, notification polling, etc.) should not block the whole app shell.
  const url = req.url ?? '';
  const isStaticAsset =
    url.includes('/assets/i18n/') ||
    url.includes('/assets/runtime-config.js');
  const isBackgroundGet = req.method.toUpperCase() === 'GET';

  if (isStaticAsset || isBackgroundGet) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.show();
  return next(req).pipe(finalize(() => loading.hide()));
};
