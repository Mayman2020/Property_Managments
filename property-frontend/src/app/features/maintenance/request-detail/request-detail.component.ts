import { Component, OnInit } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    NgIf, DatePipe, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss'
})
export class RequestDetailComponent implements OnInit {
  request: MaintenanceRequest | null = null;
  loading = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly maintSvc: MaintenanceService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.maintSvc.getById(id).subscribe({
      next: (res) => { this.request = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  statusLabel(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'قيد الانتظار', ASSIGNED: 'مُسنَّد', SCHEDULED: 'مُجدوَل',
      IN_PROGRESS: 'جاري', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',
      TENANT_ABSENT: 'غياب مستأجر', NEEDS_REVISIT: 'تحتاج مراجعة'
    };
    return m[status] ?? status;
  }
}
