import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of, switchMap } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract, RentPaymentSchedule } from '../../../core/models/contract.model';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT']);

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, RouterLink, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    EmptyStateComponent, PageHeaderComponent
  ],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss'
})
export class TenantDashboardComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  contracts: LeaseContract[] = [];
  nextDuePayment: RentPaymentSchedule | null = null;
  loading = true;
  missingTenantLink = false;
  selectedUnitId: number | null = null;

  constructor(
    private readonly maintSvc: MaintenanceService,
    private readonly portalSvc: TenantPortalService,
    readonly i18n: I18nService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const tenantId = this.auth.getCurrentUser()?.tenantId;
    if (tenantId == null) {
      this.requests = [];
      this.missingTenantLink = true;
      this.loading = false;
      return;
    }

    forkJoin({
      requestsRes: this.maintSvc.getByTenant(tenantId, { page: 0, size: 100 }),
      contractsRes: this.portalSvc.getMyContracts()
    })
      .pipe(
        switchMap(({ requestsRes, contractsRes }) => {
          this.requests = requestsRes.data?.content ?? [];
          this.contracts = contractsRes.data ?? [];
          if (this.selectedUnitId == null && this.uniqueUnits.length > 0) {
            this.selectedUnitId = this.uniqueUnits[0].unitId;
          }
          const activeContract = this.activeContract;
          return activeContract
            ? this.portalSvc.getTenantContractSchedule(activeContract.id, { page: 0, size: 50 })
            : of({ data: [] as RentPaymentSchedule[] });
        })
      )
      .subscribe({
        next: (scheduleRes) => {
          const rows = Array.isArray(scheduleRes.data) ? scheduleRes.data : scheduleRes.data?.content ?? [];
          this.nextDuePayment = this.pickNextDue(rows);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  get currentRequests(): MaintenanceRequest[] {
    return this.requests.filter((r) => ACTIVE_STATUSES.has(r.status));
  }

  get previousRequests(): MaintenanceRequest[] {
    return this.requests.filter((r) => !ACTIVE_STATUSES.has(r.status));
  }

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  get activeContract(): LeaseContract | null {
    if (this.selectedUnitId) {
      return this.contracts.find((c) => c.unitId === this.selectedUnitId) ?? null;
    }
    return this.contracts.find((c) => c.status === 'ACTIVE') ?? this.contracts[0] ?? null;
  }

  get uniqueUnits(): Array<{ unitId: number; unitNumber: string; propertyName: string }> {
    const seen = new Map<number, { unitId: number; unitNumber: string; propertyName: string }>();
    for (const c of this.contracts) {
      if (c.unitId && !seen.has(c.unitId)) {
        seen.set(c.unitId, {
          unitId: c.unitId,
          unitNumber: c.unitNumber || '',
          propertyName: c.propertyName || ''
        });
      }
    }
    return Array.from(seen.values());
  }

  onUnitChange(unitId: number): void {
    this.selectedUnitId = unitId;
    const contract = this.activeContract;
    if (contract) {
      this.portalSvc.getTenantContractSchedule(contract.id, { page: 0, size: 50 }).subscribe({
        next: (res) => {
          this.nextDuePayment = this.pickNextDue(res.data?.content ?? []);
        }
      });
    }
  }

  get unitsCount(): number {
    return new Set(this.contracts.map((c) => c.unitId)).size;
  }

  get contractStatusLabel(): string {
    return this.activeContract ? this.contractStatusLabelFor(this.activeContract.status) : this.i18n.instant('TENANT_DASHBOARD.NO_ACTIVE_CONTRACT');
  }

  get currentUserName(): string {
    const u = this.currentUser;
    if (!u) return this.i18n.instant('ROLE.TENANT');
    const ar = (u.fullNameAr ?? '').trim();
    const en = (u.fullNameEn ?? '').trim();
    const fallback = (u.fullName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || this.i18n.instant('ROLE.TENANT'))
      : (en || ar || fallback || this.i18n.instant('ROLE.TENANT'));
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`STATUS.${status}`);
  }

  contractStatusLabelFor(status: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${status}`);
  }

  statusIcon(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'hourglass_empty', ASSIGNED: 'assignment_ind', SCHEDULED: 'event',
      IN_PROGRESS: 'construction', NEEDS_REVISIT: 'replay',
      COMPLETED: 'task_alt', CANCELLED: 'cancel', TENANT_ABSENT: 'person_off'
    };
    return m[status] ?? 'info';
  }

  private pickNextDue(schedule: RentPaymentSchedule[]): RentPaymentSchedule | null {
    const dueRows = schedule
      .filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return dueRows[0] ?? null;
  }
}
