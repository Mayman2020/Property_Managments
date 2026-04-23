import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { PermissionAction } from '../models/user.model';
import { PermissionService } from '../services/permission.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  const role = auth.getRole();
  if (role && allowedRoles.includes(role)) return true;
  return router.createUrlTree([resolveFallbackRoute(auth, permissions)]);
};

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);

  const moduleKey = route.data['permission'] as string | undefined;
  const action = (route.data['permissionAction'] as PermissionAction | undefined) ?? 'view';

  if (!moduleKey || permissions.can(moduleKey, action)) {
    return true;
  }

  return router.createUrlTree([resolveFallbackRoute(auth, permissions)]);
};

export const adminGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN']);
export const officerGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER']);
export const tenantGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN', 'TENANT']);
export const superAdminGuard: CanActivateFn = roleGuard(['SUPER_ADMIN']);

function resolveFallbackRoute(auth: AuthService, permissions: PermissionService): string {
  const role = auth.getRole();
  const candidates = role === 'SUPER_ADMIN' || role === 'PROPERTY_ADMIN'
    ? [
        { route: '/admin/dashboard', permission: 'dashboard', action: 'view' as PermissionAction },
        { route: '/admin/maintenance', permission: 'maintenance', action: 'view' as PermissionAction },
        { route: '/admin/properties', permission: 'properties', action: 'view' as PermissionAction },
        { route: '/admin/profile', permission: 'profile', action: 'view' as PermissionAction }
      ]
    : role === 'MAINTENANCE_OFFICER'
      ? [
          { route: '/officer/schedule', permission: 'schedule', action: 'view' as PermissionAction },
          { route: '/officer/requests', permission: 'my_requests', action: 'view' as PermissionAction },
          { route: '/officer/profile', permission: 'profile', action: 'view' as PermissionAction }
        ]
      : role === 'TENANT'
        ? [
            { route: '/tenant/my-unit', permission: 'my_unit', action: 'view' as PermissionAction },
            { route: '/tenant/requests', permission: 'my_requests', action: 'view' as PermissionAction },
            { route: '/tenant/profile', permission: 'profile', action: 'view' as PermissionAction }
          ]
        : [];

  const firstAllowed = candidates.find((item) => permissions.can(item.permission, item.action));
  return firstAllowed?.route ?? auth.getDashboardRoute();
}
