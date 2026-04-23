import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { officerGuard, permissionGuard } from '../../core/guards/auth.guard';

export const OFFICER_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [officerGuard],
    children: [
      { path: '', redirectTo: 'schedule', pathMatch: 'full' },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_requests', permissionAction: 'view', listContext: 'officer' },
        path: 'requests',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'schedule', permissionAction: 'view' },
        path: 'schedule',
        loadComponent: () => import('./officer-schedule/officer-schedule.component').then((m) => m.OfficerScheduleComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_requests', permissionAction: 'view' },
        path: 'requests/:id',
        loadComponent: () => import('../maintenance/request-detail/request-detail.component').then((m) => m.RequestDetailComponent)
      },
      {
        canActivate: [permissionGuard],
        data: { permission: 'my_requests', permissionAction: 'submit' },
        path: 'requests/:id/visit-report',
        loadComponent: () => import('../maintenance/visit-report-form/visit-report-form.component').then((m) => m.VisitReportFormComponent)
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
