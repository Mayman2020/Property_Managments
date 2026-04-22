import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { adminGuard } from '../../core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'properties',
        loadComponent: () => import('../properties/property-list/property-list.component').then((m) => m.PropertyListComponent)
      },
      {
        path: 'properties/new',
        loadComponent: () => import('../properties/property-form/property-form.component').then((m) => m.PropertyFormComponent)
      },
      {
        path: 'maintenance',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent)
      },
      {
        path: 'maintenance/new',
        loadComponent: () => import('../maintenance/request-form/request-form.component').then((m) => m.RequestFormComponent)
      },
      {
        path: 'maintenance/:id',
        loadComponent: () => import('../maintenance/request-detail/request-detail.component').then((m) => m.RequestDetailComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('../inventory/inventory-list/inventory-list.component').then((m) => m.InventoryListComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.component').then((m) => m.ProfileComponent)
      }
    ]
  }
];
