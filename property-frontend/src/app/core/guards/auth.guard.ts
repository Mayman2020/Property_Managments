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

export const moduleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);

  const moduleKey = route.data['module'] as string | undefined;
  if (!moduleKey || permissions.can(moduleKey, 'view')) {
    return true;
  }

  return router.createUrlTree([resolveFallbackRoute(auth, permissions)]);
};

export const adminGuard: CanActivateFn = roleGuard([
  'SUPER_ADMIN',
  'PROPERTY_ADMIN',
  'CONTRACTS_OFFICER',
  'ACCOUNTANT',
  'HR_OFFICER',
  'OWNER'
]);
export const officerGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER']);
export const tenantGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN', 'TENANT']);
export const ownerGuard: CanActivateFn = roleGuard(['OWNER']);
export const superAdminGuard: CanActivateFn = roleGuard(['SUPER_ADMIN']);
export const contractsGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'ACCOUNTANT']);

function resolveFallbackRoute(auth: AuthService, permissions: PermissionService): string {
  const role = auth.getRole();
  const candidates = role === 'SUPER_ADMIN' || role === 'PROPERTY_ADMIN'
    ? [
        { route: '/admin/home', permission: 'dashboard', action: 'view' as PermissionAction },
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
      : role === 'CONTRACTS_OFFICER'
        ? [
            { route: '/admin/home', permission: 'contracts', action: 'view' as PermissionAction },
            { route: '/admin/contracts/dashboard', permission: 'contracts', action: 'view' as PermissionAction },
            { route: '/admin/contracts/list', permission: 'contracts', action: 'view' as PermissionAction },
            { route: '/admin/profile', permission: 'profile', action: 'view' as PermissionAction }
          ]
        : role === 'ACCOUNTANT'
          ? [
              { route: '/admin/home', permission: 'finance', action: 'view' as PermissionAction },
              { route: '/admin/finance/dashboard', permission: 'finance', action: 'view' as PermissionAction },
              { route: '/admin/contracts/payments', permission: 'contracts', action: 'view' as PermissionAction },
              { route: '/admin/profile', permission: 'profile', action: 'view' as PermissionAction }
            ]
          : role === 'HR_OFFICER'
            ? [
                { route: '/admin/home', permission: 'hr', action: 'view' as PermissionAction },
                { route: '/admin/hr/employees', permission: 'hr', action: 'view' as PermissionAction },
                { route: '/admin/hr/payroll', permission: 'hr', action: 'view' as PermissionAction },
                { route: '/admin/profile', permission: 'profile', action: 'view' as PermissionAction }
              ]
            : role === 'OWNER'
              ? [
                  { route: '/admin/home', permission: 'owner_portal', action: 'view' as PermissionAction },
                  { route: '/admin/owner-portal/dashboard', permission: 'owner_portal', action: 'view' as PermissionAction },
                  { route: '/admin/owner-portal/statements', permission: 'owner_portal', action: 'view' as PermissionAction },
                  { route: '/admin/profile', permission: 'profile', action: 'view' as PermissionAction }
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
