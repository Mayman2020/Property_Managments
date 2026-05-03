import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TokenStorageService } from '../auth/token-storage.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/login')) {
        tokenStorage.clearAll();
        void router.navigateByUrl('/auth/login');
      }

      const errorCode = err.error?.errorCode as string | undefined;
      const rawMsg = (err.error?.message ?? err.message ?? '') as string;

      const message = translateBackendError(errorCode, rawMsg, translate);
      return throwError(() => new Error(message));
    })
  );
};

function translateBackendError(errorCode: string | undefined, rawMsg: string, translate: TranslateService): string {
  if (rawMsg.includes('Cannot reach backend')) return rawMsg;

  switch (errorCode) {
    case 'FLOOR_CAPACITY_REACHED': {
      const match = rawMsg.match(/Floor (\d+) capacity reached \((\d+) units max\)/);
      const floor = match?.[1] ?? '';
      const capacity = match?.[2] ?? '';
      return translate.instant('ERRORS.FLOOR_CAPACITY_REACHED', { floor, capacity });
    }
    case 'PROPERTY_HAS_UNITS':
      return translate.instant('ERRORS.PROPERTY_HAS_UNITS');
    case 'UNIT_IS_RENTED':
      return translate.instant('ERRORS.UNIT_IS_RENTED');
    default:
      return rawMsg || translate.instant('ERRORS.GENERIC');
  }
}
