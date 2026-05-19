import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./features/change-password/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent
      )
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
  },
  {
    path: 'officer',
    canActivate: [authGuard],
    loadChildren: () => import('./features/officer/officer.routes').then((m) => m.OFFICER_ROUTES)
  },
  {
    path: 'tenant',
    canActivate: [authGuard],
    loadChildren: () => import('./features/tenant/tenant.routes').then((m) => m.TENANT_ROUTES)
  },
  {
    path: 'employee',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/employee-portal/employee-portal.routes').then(
        (m) => m.EMPLOYEE_PORTAL_ROUTES
      )
  },
  { path: '**', redirectTo: 'auth/login' }
];
