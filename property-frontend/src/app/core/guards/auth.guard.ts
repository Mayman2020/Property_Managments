import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  const role = auth.getRole();
  if (role && allowedRoles.includes(role)) return true;
  return router.createUrlTree([auth.getDashboardRoute()]);
};

export const adminGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN']);
export const officerGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER']);
export const tenantGuard: CanActivateFn = roleGuard(['TENANT']);
