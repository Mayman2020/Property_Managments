import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { tenantGuard } from '../../core/guards/auth.guard';

export const TENANT_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [tenantGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./tenant-dashboard/tenant-dashboard.component').then((m) => m.TenantDashboardComponent)
      },
      {
        path: 'new-request',
        loadComponent: () => import('../maintenance/request-form/request-form.component').then((m) => m.RequestFormComponent)
      },
      {
        path: 'requests',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent),
        data: { listContext: 'tenant' }
      },
      {
        path: 'requests/:id',
        loadComponent: () => import('../maintenance/request-detail/request-detail.component').then((m) => m.RequestDetailComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.component').then((m) => m.ProfileComponent)
      }
    ]
  }
];
