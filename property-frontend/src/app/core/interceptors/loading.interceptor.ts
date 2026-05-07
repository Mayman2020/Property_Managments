import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';
import { shouldSkipGlobalLoaderForUpload } from '../constants/app-constants';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Keep full-screen loader for user-triggered/mutating requests only.
  // Background GETs (dashboard cards, notification polling, etc.) should not block the whole app shell.
  const url = req.url ?? '';
  const method = req.method.toUpperCase();
  const isStaticAsset =
    url.includes('/assets/i18n/') ||
    url.includes('/assets/runtime-config.js');
  const isBackgroundGet = method === 'GET';
  /** Form uploads show their own spinners; global overlay here often feels “stuck” on small files. */
  const isMultipartUpload = shouldSkipGlobalLoaderForUpload(url, method);

  if (isStaticAsset || isBackgroundGet || isMultipartUpload) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.show();
  return next(req).pipe(finalize(() => loading.hide()));
};
