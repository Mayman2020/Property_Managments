import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { adminGuard, permissionGuard, superAdminGuard } from '../../core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        canActivate: [permissionGuard],
        data: { permission: 'dashboard', permissionAction: 'view' },
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'view' },
        path: 'properties',
        loadComponent: () => import('../properties/property-list/property-list.component').then((m) => m.PropertyListComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'create' },
        path: 'properties/new',
        loadComponent: () => import('../properties/property-form/property-form.component').then((m) => m.PropertyFormComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'view' },
        path: 'properties/:id',
        loadComponent: () => import('../properties/property-form/property-form.component').then((m) => m.PropertyFormComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'edit' },
        path: 'properties/:id/edit',
        loadComponent: () => import('../properties/property-form/property-form.component').then((m) => m.PropertyFormComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'units', permissionAction: 'view' },
        path: 'units',
        loadComponent: () => import('../units/unit-management.component').then((m) => m.UnitManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'tenants', permissionAction: 'view' },
        path: 'tenants',
        loadComponent: () => import('../tenants/tenant-management.component').then((m) => m.TenantManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'maintenance', permissionAction: 'view', listContext: 'admin' },
        path: 'maintenance',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'maintenance', permissionAction: 'create' },
        path: 'maintenance/new',
        loadComponent: () => import('../maintenance/request-form/request-form.component').then((m) => m.RequestFormComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'maintenance', permissionAction: 'view' },
        path: 'maintenance/:id',
        loadComponent: () => import('../maintenance/request-detail/request-detail.component').then((m) => m.RequestDetailComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'inventory', permissionAction: 'view' },
        path: 'inventory',
        loadComponent: () => import('../inventory/inventory-list/inventory-list.component').then((m) => m.InventoryListComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'reports', permissionAction: 'view' },
        path: 'reports',
        loadComponent: () => import('../reports/reports-dashboard.component').then((m) => m.ReportsDashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'users', permissionAction: 'view' },
        path: 'users',
        loadComponent: () => import('../users/user-management.component').then((m) => m.UserManagementComponent)
      },
      {
        canActivate: [superAdminGuard, permissionGuard],
        data: { permission: 'users', permissionAction: 'edit' },
        path: 'user-access',
        loadComponent: () => import('../users/user-access-management.component').then((m) => m.UserAccessManagementComponent)
      },
      {
        canActivate: [superAdminGuard, permissionGuard],
        data: { permission: 'permissions', permissionAction: 'view' },
        path: 'screens',
        loadComponent: () => import('../permissions/screen-management.component').then((m) => m.ScreenManagementComponent)
      },
      {
        canActivate: [superAdminGuard, permissionGuard],
        data: { permission: 'permissions', permissionAction: 'view' },
        path: 'permissions',
        loadComponent: () => import('../permissions/permission-management.component').then((m) => m.PermissionManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'lookups', permissionAction: 'view' },
        path: 'lookups',
        loadComponent: () => import('../lookups/lookup-management.component').then((m) => m.LookupManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'ratings', permissionAction: 'view' },
        path: 'ratings',
        loadComponent: () => import('../ratings/ratings-dashboard.component').then((m) => m.RatingsDashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'contractors', permissionAction: 'view' },
        path: 'contractors',
        loadComponent: () => import('../contractors/contractor-companies.component').then((m) => m.ContractorCompaniesComponent)
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
