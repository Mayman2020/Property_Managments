import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { adminGuard, permissionGuard, superAdminGuard, contractsGuard, moduleGuard, ownerGuard, roleGuard } from '../../core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'home',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'dashboard', permissionAction: 'view' },
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'view' },
        path: 'properties',
        loadComponent: () => import('../properties/property-list/property-list.component').then((m) => m.PropertyListComponent)
      },

      {
        canActivate: [permissionGuard],
        data: { permission: 'units', permissionAction: 'view' },
        path: 'units',
        loadComponent: () => import('../units/unit-management/unit-management.component').then((m) => m.UnitManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'tenants', permissionAction: 'view' },
        path: 'tenants',
        loadComponent: () => import('../tenants/tenant-list/tenant-management.component').then((m) => m.TenantManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'maintenance', permissionAction: 'view', listContext: 'admin' },
        path: 'maintenance',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent)
      },
      {
        path: 'my-requests',
        loadComponent: () => import('../my-requests/my-requests-page/my-requests-page.component').then((m) => m.MyRequestsPageComponent)
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
        loadComponent: () => import('../reports/reports-dashboard/reports-dashboard.component').then((m) => m.ReportsDashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'contracts', permissionAction: 'view' },
        path: 'reports/contract-expiry',
        loadComponent: () => import('./reports/contract-expiry-report/contract-expiry-report.component').then((m) => m.ContractExpiryReportComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'view' },
        path: 'reports/occupancy',
        loadComponent: () => import('./reports/occupancy-analytics/occupancy-analytics.component').then((m) => m.OccupancyAnalyticsComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'maintenance', permissionAction: 'view' },
        path: 'reports/maintenance',
        loadComponent: () => import('./reports/maintenance-report/maintenance-report.component').then((m) => m.MaintenanceReportComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'finance', permissionAction: 'view' },
        path: 'reports/budget-vs-actual',
        loadComponent: () => import('./reports/budget-vs-actual/budget-vs-actual.component').then((m) => m.BudgetVsActualComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'users', permissionAction: 'view' },
        path: 'users',
        loadComponent: () => import('../users/user-management/user-management.component').then((m) => m.UserManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'settings', permissionAction: 'view' },
        path: 'legal-entities',
        loadComponent: () => import('../legal-entities/legal-entities.component').then((m) => m.LegalEntitiesComponent)
      },
      {
        canActivate: [superAdminGuard, permissionGuard],
        data: { permission: 'users', permissionAction: 'edit' },
        path: 'user-access',
        loadComponent: () => import('../users/user-access-management/user-access-management.component').then((m) => m.UserAccessManagementComponent)
      },
      {
        canActivate: [superAdminGuard, permissionGuard],
        data: { permission: 'permissions', permissionAction: 'view' },
        path: 'screens',
        loadComponent: () => import('../permissions/screen-management/screen-management.component').then((m) => m.ScreenManagementComponent)
      },
      {
        canActivate: [superAdminGuard, permissionGuard],
        data: { permission: 'permissions', permissionAction: 'view' },
        path: 'permissions',
        loadComponent: () => import('../permissions/permission-management/permission-management.component').then((m) => m.PermissionManagementComponent)
      },
      {
        canActivate: [moduleGuard],
        data: { module: 'permissions' },
        path: 'module-settings',
        loadComponent: () => import('../permissions/module-management/module-management.component').then((m) => m.ModuleManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'lookups', permissionAction: 'view' },
        path: 'lookups',
        loadComponent: () => import('../lookups/lookup-management/lookup-management.component').then((m) => m.LookupManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'ratings', permissionAction: 'view' },
        path: 'ratings',
        loadComponent: () => import('../ratings/ratings-dashboard/ratings-dashboard.component').then((m) => m.RatingsDashboardComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'contractors', permissionAction: 'view' },
        path: 'contractors',
        loadComponent: () => import('../contractors/contractor-list/contractor-companies.component').then((m) => m.ContractorCompaniesComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'contractors', permissionAction: 'view' },
        path: 'contractors/:id',
        loadComponent: () => import('../contractors/contractor-detail/contractor-detail.component').then((m) => m.ContractorDetailComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'properties', permissionAction: 'view' },
        path: 'owners',
        loadComponent: () => import('../owners/owner-list/owners-management.component').then((m) => m.OwnersManagementComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'profile', permissionAction: 'view' },
        path: 'profile',
        loadComponent: () => import('../profile/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        canActivate: [moduleGuard],
        data: { module: 'notifications' },
        path: 'notifications',
        loadComponent: () => import('../notifications/notifications-page/notifications-page.component').then((m) => m.NotificationsPageComponent)
      },
      {
        canActivate: [moduleGuard],
        data: { module: 'audit' },
        path: 'audit-log',
        loadComponent: () => import('../audit/audit-log/audit-log.component').then((m) => m.AuditLogComponent)
      },
      {
        path: 'hr',
        canActivate: [moduleGuard],
        data: { module: 'hr' },
        children: [
          {
            path: 'employees',
            data: { section: 'employees-list' },
            loadComponent: () => import('../hr/hr-workspace/hr-workspace.component').then((m) => m.HrWorkspaceComponent)
          },
          {
            path: 'employees/new',
            redirectTo: 'employees',
            pathMatch: 'full'
          },
          {
            path: 'employees/:id',
            data: { section: 'employee-detail' },
            loadComponent: () => import('../hr/hr-workspace/hr-workspace.component').then((m) => m.HrWorkspaceComponent)
          },
          {
            path: 'leaves',
            data: { section: 'leaves' },
            loadComponent: () => import('../hr/hr-workspace/hr-workspace.component').then((m) => m.HrWorkspaceComponent)
          },
          {
            path: 'attendance',
            redirectTo: 'employees',
            pathMatch: 'full'
          },
          {
            path: 'deductions',
            data: { section: 'deductions' },
            loadComponent: () => import('../hr/hr-workspace/hr-workspace.component').then((m) => m.HrWorkspaceComponent)
          },
          {
            path: 'payroll',
            data: { section: 'payroll-list' },
            loadComponent: () => import('../hr/hr-workspace/hr-workspace.component').then((m) => m.HrWorkspaceComponent)
          },
          {
            path: 'payroll/:id',
            data: { section: 'payroll-detail' },
            loadComponent: () => import('../hr/hr-workspace/hr-workspace.component').then((m) => m.HrWorkspaceComponent)
          },
        ]
      },
      {
        path: 'finance',
        canActivate: [moduleGuard],
        data: { module: 'finance' },
        children: [
          {
            path: 'dashboard',
            data: { section: 'dashboard' },
            loadComponent: () => import('../finance/finance-workspace/finance-workspace.component').then((m) => m.FinanceWorkspaceComponent)
          },
          {
            path: 'expenses',
            data: { section: 'expenses' },
            loadComponent: () => import('../finance/finance-workspace/finance-workspace.component').then((m) => m.FinanceWorkspaceComponent)
          },
          {
            path: 'revenues',
            data: { section: 'revenues' },
            loadComponent: () => import('../finance/finance-workspace/finance-workspace.component').then((m) => m.FinanceWorkspaceComponent)
          },
          {
            path: 'budget',
            data: { section: 'budget' },
            loadComponent: () => import('../finance/finance-workspace/finance-workspace.component').then((m) => m.FinanceWorkspaceComponent)
          },
          {
            path: 'reports/pnl',
            data: { report: 'pnl' },
            loadComponent: () => import('../finance/finance-reports/finance-reports.component').then((m) => m.FinanceReportsComponent)
          },
          {
            path: 'reports/cashflow',
            data: { report: 'cashflow' },
            loadComponent: () => import('../finance/finance-reports/finance-reports.component').then((m) => m.FinanceReportsComponent)
          },
          {
            path: 'reports/owner-statement',
            data: { report: 'owner-statement' },
            loadComponent: () => import('../finance/finance-reports/finance-reports.component').then((m) => m.FinanceReportsComponent)
          },
          {
            path: 'overdue-payments',
            loadComponent: () => import('../finance/overdue-payments/overdue-payments.component').then((m) => m.OverduePaymentsComponent)
          }
        ]
      },
      {
        path: 'inspections/:id',
        canActivate: [moduleGuard],
        data: { module: 'contracts' },
        loadComponent: () => import('../inspections/inspection-detail/inspection-detail.component').then((m) => m.InspectionDetailComponent)
      },
      {
        path: 'vacancies',
        canActivate: [moduleGuard],
        data: { module: 'vacancies' },
        children: [
          {
            path: 'list',
            redirectTo: '/admin/units',
            pathMatch: 'full'
          },
          {
            path: '',
            redirectTo: '/admin/units',
            pathMatch: 'full'
          },
          {
            path: ':id/inquiries',
            data: { section: 'inquiries' },
            loadComponent: () => import('../vacancies/vacancy-workspace/vacancy-workspace.component').then((m) => m.VacancyWorkspaceComponent)
          }
        ]
      },
      {
        path: 'owner-portal',
        canActivate: [moduleGuard, ownerGuard],
        data: { module: 'owner_portal' },
        children: [
          {
            path: 'dashboard',
            data: { section: 'dashboard' },
            loadComponent: () => import('../owner-portal/owner-portal-workspace/owner-portal-workspace.component').then((m) => m.OwnerPortalWorkspaceComponent)
          },
          {
            path: 'statements',
            data: { section: 'statements' },
            loadComponent: () => import('../owner-portal/owner-portal-workspace/owner-portal-workspace.component').then((m) => m.OwnerPortalWorkspaceComponent)
          },
          {
            path: 'properties',
            data: { section: 'properties' },
            loadComponent: () => import('../owner-portal/owner-portal-workspace/owner-portal-workspace.component').then((m) => m.OwnerPortalWorkspaceComponent)
          }
        ]
      },
      // Accountant Portal
      {
        path: 'accountant-portal',
        canActivate: [permissionGuard],
        data: { permission: 'contracts', permissionAction: 'view' },
        children: [
          {
            path: 'rent-confirmation',
            loadComponent: () => import('../accountant/rent-confirmation/rent-confirmation.component').then((m) => m.RentConfirmationComponent)
          },
          {
            path: 'renewal-requests',
            redirectTo: '/admin/owner-portal/contract-approvals?tab=renewals',
            pathMatch: 'full'
          },
          {
            path: 'maintenance-invoices',
            loadComponent: () => import('../accountant/maintenance-invoices/maintenance-invoices.component').then((m) => m.MaintenanceInvoicesComponent)
          }
        ]
      },
      // Owner Approval Portal
      {
        path: 'owner-portal/contract-approvals',
        canActivate: [moduleGuard, roleGuard(['OWNER', 'SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'])],
        data: { module: 'owner_portal' },
        loadComponent: () => import('../owner/contract-approvals/contract-approvals.component').then((m) => m.ContractApprovalsComponent)
      },
      // Contracts & Rentals Module
      {
        path: 'contracts',
        canActivate: [contractsGuard, moduleGuard],
        data: { module: 'contracts' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () => import('../contracts/contracts-dashboard/contracts-dashboard.component').then((m) => m.ContractsDashboardComponent)
          },
          {
            path: 'list',
            loadComponent: () => import('../contracts/contract-list/contract-list.component').then((m) => m.ContractListComponent)
          },

          {
            path: 'templates',
            loadComponent: () => import('../contracts/contract-templates/contract-templates.component').then((m) => m.ContractTemplatesComponent)
          },
          {
            path: 'complaints',
            loadComponent: () => import('../contracts/complaints-list/complaints-list.component').then((m) => m.ComplaintsListComponent)
          },
          {
            path: 'maintenance/:id',
            loadComponent: () => import('../contracts/maintenance-contract-detail/maintenance-contract-detail.component').then((m) => m.MaintenanceContractDetailComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('../contracts/contract-detail/contract-detail.component').then((m) => m.ContractDetailComponent)
          },
          {
            path: ':id/renew',
            loadComponent: () => import('../contracts/contract-renewal-form/contract-renewal-form.component').then((m) => m.ContractRenewalFormComponent)
          }
        ]
      }
    ]
  }
];
