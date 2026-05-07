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
  const activeRole = auth.getRole();
  if (activeRole && allowedRoles.includes(activeRole)) return true;
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
  'GENERAL_MANAGER',
  'ACCOUNTANT',
  'MAINTENANCE_OFFICER_INTERNAL',
  'MAINTENANCE_OFFICER_COMPANY',
  'MAINTENANCE_COMPANY',
  'PROPERTY_GUARD',
  'PROCEDURES_CLERK',
  'OWNER'
]);
export const officerGuard: CanActivateFn = roleGuard([
  'SUPER_ADMIN',
  'GENERAL_MANAGER',
  'MAINTENANCE_OFFICER_INTERNAL',
  'MAINTENANCE_OFFICER_COMPANY',
  'MAINTENANCE_COMPANY'
]);
export const tenantGuard: CanActivateFn = roleGuard(['SUPER_ADMIN', 'GENERAL_MANAGER', 'TENANT']);
export const ownerGuard: CanActivateFn = roleGuard(['OWNER']);
export const superAdminGuard: CanActivateFn = roleGuard(['SUPER_ADMIN']);
export const contractsGuard: CanActivateFn = roleGuard([
  'SUPER_ADMIN',
  'GENERAL_MANAGER',
  'ACCOUNTANT',
  'OWNER'
]);

function resolveFallbackRoute(auth: AuthService, permissions: PermissionService): string {
  const activeRole = auth.getRole();
  const roles = activeRole ? [activeRole] : auth.getEffectiveRoles();
  const seen = new Set<string>();
  const blocks: Array<{ route: string; permission: string; action: PermissionAction }[]> = [];
  if (roles.some((r) => r === 'SUPER_ADMIN' || r === 'GENERAL_MANAGER')) {
    blocks.push([
      { route: '/admin/home', permission: 'dashboard', action: 'view' },
      { route: '/admin/dashboard', permission: 'dashboard', action: 'view' },
      { route: '/admin/maintenance', permission: 'maintenance', action: 'view' },
      { route: '/admin/properties', permission: 'properties', action: 'view' },
      { route: '/admin/profile', permission: 'profile', action: 'view' }
    ]);
  }
  if (
    roles.some(
      (r) =>
        r === 'MAINTENANCE_OFFICER_INTERNAL' ||
        r === 'MAINTENANCE_OFFICER_COMPANY' ||
        r === 'MAINTENANCE_COMPANY'
    )
  ) {
    blocks.push([
      { route: '/officer/schedule', permission: 'schedule', action: 'view' },
      { route: '/officer/requests', permission: 'my_requests', action: 'view' },
      { route: '/officer/profile', permission: 'profile', action: 'view' }
    ]);
  }
  if (roles.includes('ACCOUNTANT')) {
    blocks.push([
      { route: '/admin/home', permission: 'finance', action: 'view' },
      { route: '/admin/finance/dashboard', permission: 'finance', action: 'view' },
      { route: '/admin/contracts/list', permission: 'contracts', action: 'view' },
      { route: '/admin/profile', permission: 'profile', action: 'view' }
    ]);
  }
  if (roles.includes('PROCEDURES_CLERK')) {
    blocks.push([
      { route: '/admin/home', permission: 'hr', action: 'view' },
      { route: '/admin/hr/employees', permission: 'hr', action: 'view' },
      { route: '/admin/profile', permission: 'profile', action: 'view' }
    ]);
  }
  if (roles.includes('PROPERTY_GUARD')) {
    blocks.push([
      { route: '/admin/home', permission: 'dashboard', action: 'view' },
      { route: '/admin/maintenance', permission: 'maintenance', action: 'view' },
      { route: '/admin/profile', permission: 'profile', action: 'view' }
    ]);
  }
  if (roles.includes('OWNER')) {
    blocks.push([
      { route: '/admin/home', permission: 'dashboard', action: 'view' },
      { route: '/admin/dashboard', permission: 'dashboard', action: 'view' },
      { route: '/admin/properties', permission: 'properties', action: 'view' },
      { route: '/admin/owner-portal/dashboard', permission: 'owner_portal', action: 'view' },
      { route: '/admin/owner-portal/contract-approvals', permission: 'owner_portal', action: 'view' },
      { route: '/admin/profile', permission: 'profile', action: 'view' }
    ]);
  }
  if (roles.includes('TENANT')) {
    blocks.push([
      { route: '/tenant/my-unit', permission: 'my_unit', action: 'view' },
      { route: '/tenant/requests', permission: 'my_requests', action: 'view' },
      { route: '/tenant/profile', permission: 'profile', action: 'view' }
    ]);
  }

  const candidates: Array<{ route: string; permission: string; action: PermissionAction }> = [];
  for (const group of blocks) {
    for (const item of group) {
      if (!seen.has(item.route)) {
        seen.add(item.route);
        candidates.push(item);
      }
    }
  }

  const firstAllowed = candidates.find((item) => permissions.can(item.permission, item.action));
  return firstAllowed?.route ?? auth.getDashboardRoute();
}
