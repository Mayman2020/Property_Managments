import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../auth/token-storage.service';
import { HTTP_HEADERS } from '../constants/app-constants';
import { CurrentUser } from '../models/user.model';
import { ScopedPropertyService } from '../services/scoped-property.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const scopedProperty = inject(ScopedPropertyService);
  const token = tokenStorage.getToken();
  const user = tokenStorage.getUser<CurrentUser>();
  const activeRole = user?.activeRole ?? user?.role;
  const selectedPropertyId = scopedProperty.selectedPropertyIdValue;

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeRole) {
    headers[HTTP_HEADERS.ACTIVE_ROLE] = activeRole;
  }
  if (selectedPropertyId != null) {
    headers[HTTP_HEADERS.SELECTED_PROPERTY_ID] = String(selectedPropertyId);
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers });
  }
  return next(req);
};
