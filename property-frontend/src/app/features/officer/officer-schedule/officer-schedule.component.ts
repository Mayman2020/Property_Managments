import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { MaintenanceRequest, MaintenanceService } from '../../../core/services/maintenance.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-officer-schedule',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DatePipe,
    SlicePipe,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './officer-schedule.component.html',
  styleUrl: './officer-schedule.component.scss'
})
export class OfficerScheduleComponent implements OnInit {
  loading = true;
  visits: MaintenanceRequest[] = [];

  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly auth: AuthService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    const officerId = this.auth.getCurrentUser()?.id;
    if (!officerId) {
      this.loading = false;
      return;
    }

    this.maintenanceService.getByOfficer(officerId, { page: 0, size: 100 }).subscribe({
      next: (res) => {
        const list = res.data?.content ?? [];
        this.visits = list
          .filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
          .sort((a, b) => this.toVisitStamp(a) - this.toVisitStamp(b));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get totalDistanceKm(): number {
    return Math.max(6, this.visits.length * 7);
  }

  get totalDurationMin(): number {
    return Math.max(20, this.visits.length * 22);
  }

  visitTime(req: MaintenanceRequest): string {
    if (req.scheduledTimeFrom) return req.scheduledTimeFrom;
    return '09:00';
  }

  travelMinutes(index: number): number {
    return 10 + (index * 4);
  }

  private toVisitStamp(req: MaintenanceRequest): number {
    const baseDate = req.scheduledDate ?? req.createdAt;
    if (!baseDate) return Number.MAX_SAFE_INTEGER;
    const time = req.scheduledTimeFrom ? `T${req.scheduledTimeFrom}:00` : 'T23:59:00';
    const dt = new Date(`${baseDate}${time}`);
    return Number.isNaN(dt.getTime()) ? Number.MAX_SAFE_INTEGER : dt.getTime();
  }
}
