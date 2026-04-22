import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip static runtime/i18n assets to avoid unnecessary full-screen blocking spinner.
  const url = req.url ?? '';
  const isStaticAsset =
    url.includes('/assets/i18n/') ||
    url.includes('/assets/runtime-config.js');

  if (isStaticAsset) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.show();
  return next(req).pipe(finalize(() => loading.hide()));
};
