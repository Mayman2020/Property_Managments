import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
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
  { path: '**', redirectTo: 'auth/login' }
];
