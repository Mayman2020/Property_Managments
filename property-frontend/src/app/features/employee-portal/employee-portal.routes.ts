import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { employeePortalGuard } from '../../core/guards/auth.guard';

export const EMPLOYEE_PORTAL_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [employeePortalGuard],
    children: [
      { path: '', redirectTo: 'my-payslips', pathMatch: 'full' },
      {
        path: 'my-payslips',
        loadComponent: () =>
          import('./my-payslips/my-payslips.component').then((m) => m.MyPayslipsComponent)
      },
      {
        path: 'my-payslips/:id',
        loadComponent: () =>
          import('./payslip-detail/payslip-detail.component').then((m) => m.PayslipDetailComponent)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../notifications/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../profile/profile/profile.component').then((m) => m.ProfileComponent)
      }
    ]
  }
];
