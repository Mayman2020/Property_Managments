import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TokenStorageService } from '../auth/token-storage.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/login')) {
        tokenStorage.clearAll();
        void router.navigateByUrl('/auth/login');
      }
      const message =
        err.status === 0
          ? 'Cannot reach backend server. Please make sure backend is running on the configured port.'
          : (err.error?.message ?? err.message ?? 'An error occurred');
      return throwError(() => new Error(message));
    })
  );
};
