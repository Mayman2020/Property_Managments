import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { permissionGuard, tenantGuard } from '../../core/guards/auth.guard';

export const TENANT_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [tenantGuard],
    children: [
      { path: '', redirectTo: 'my-unit', pathMatch: 'full' },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_unit', permissionAction: 'view' },
        path: 'dashboard',
        loadComponent: () => import('./tenant-dashboard/tenant-dashboard.component').then((m) => m.TenantDashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_unit', permissionAction: 'view' },
        path: 'my-unit',
        loadComponent: () => import('./tenant-dashboard/tenant-dashboard.component').then((m) => m.TenantDashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'new_request', permissionAction: 'create' },
        path: 'new-request',
        loadComponent: () => import('../maintenance/request-form/request-form.component').then((m) => m.RequestFormComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_requests', permissionAction: 'view', listContext: 'tenant' },
        path: 'requests',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_requests', permissionAction: 'view' },
        path: 'requests/:id',
        loadComponent: () => import('../maintenance/request-detail/request-detail.component').then((m) => m.RequestDetailComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'profile', permissionAction: 'view' },
        path: 'profile',
        loadComponent: () => import('../profile/profile.component').then((m) => m.ProfileComponent)
      }
    ]
  }
];
