import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { officerGuard } from '../../core/guards/auth.guard';

export const OFFICER_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [officerGuard],
    children: [
      { path: '', redirectTo: 'requests', pathMatch: 'full' },
      {
        path: 'requests',
        loadComponent: () => import('../maintenance/request-list/request-list.component').then((m) => m.RequestListComponent),
        data: { listContext: 'officer' }
      },
      {
        path: 'requests/:id',
        loadComponent: () => import('../maintenance/request-detail/request-detail.component').then((m) => m.RequestDetailComponent)
      },
      {
        path: 'requests/:id/visit-report',
        loadComponent: () => import('../maintenance/visit-report-form/visit-report-form.component').then((m) => m.VisitReportFormComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.component').then((m) => m.ProfileComponent)
      }
    ]
  }
];
