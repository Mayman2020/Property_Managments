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
import { SearchDropdownComponent, SearchDropdownItem } from '../../../shared/components/search-dropdown/search-dropdown.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { MaintenanceService, MaintenanceRequest } from '../../../core/services/maintenance.service';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { ComplaintService } from '../../../core/services/complaint.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract, RentPaymentSchedule, TenantComplaint } from '../../../core/models/contract.model';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'NEEDS_REVISIT']);

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, RouterLink, TranslateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    EmptyStateComponent, PageHeaderComponent, SearchDropdownComponent, TablePagerComponent
  ],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss'
})
export class TenantDashboardComponent implements OnInit {
  requests: MaintenanceRequest[] = [];
  contracts: LeaseContract[] = [];
  complaints: TenantComplaint[] = [];
  contractSchedule: RentPaymentSchedule[] = [];
  nextDuePayment: RentPaymentSchedule | null = null;
  loading = true;
  missingTenantLink = false;
  selectedUnitId: number | null = null;
  requestSearchTerm = '';
  statusFilter: string | null = null;
  requestPageIndex = 0;
  readonly requestPageSize = 5;

  readonly statusFilterOptions = [
    { value: 'PENDING',      labelAr: 'معلق',        labelEn: 'Pending' },
    { value: 'ASSIGNED',     labelAr: 'مُسند',        labelEn: 'Assigned' },
    { value: 'SCHEDULED',    labelAr: 'مجدول',        labelEn: 'Scheduled' },
    { value: 'IN_PROGRESS',  labelAr: 'قيد التنفيذ',  labelEn: 'In Progress' },
    { value: 'NEEDS_REVISIT',labelAr: 'يحتاج مراجعة', labelEn: 'Revisit' },
    { value: 'COMPLETED',    labelAr: 'مكتمل',        labelEn: 'Completed' },
    { value: 'CANCELLED',    labelAr: 'ملغي',         labelEn: 'Cancelled' },
  ];

  constructor(
    private readonly maintSvc: MaintenanceService,
    private readonly portalSvc: TenantPortalService,
    private readonly complaintSvc: ComplaintService,
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
      contractsRes: this.portalSvc.getMyContracts(),
      complaintsRes: this.complaintSvc.getMy()
    })
      .pipe(
        switchMap(({ requestsRes, contractsRes, complaintsRes }) => {
          this.requests = requestsRes.data?.content ?? [];
          this.contracts = contractsRes.data ?? [];
          this.complaints = complaintsRes?.data?.content ?? complaintsRes?.data ?? complaintsRes?.content ?? complaintsRes ?? [];
          const activeContract = this.activeContract;
          return activeContract
            ? this.portalSvc.getTenantContractSchedule(activeContract.id, { page: 0, size: 50 })
            : of({ data: [] as RentPaymentSchedule[] });
        })
      )
      .subscribe({
        next: (scheduleRes) => {
          const rows = Array.isArray(scheduleRes.data) ? scheduleRes.data : scheduleRes.data?.content ?? [];
          this.contractSchedule = rows;
          this.nextDuePayment = this.pickNextDue(rows);
          if (!this.selectedUnitId && this.uniqueUnits.length === 1) {
            this.selectedUnitId = this.uniqueUnits[0].unitId;
            const contract = this.activeContract;
            if (contract) {
              this.portalSvc.getTenantContractSchedule(contract.id, { page: 0, size: 50 }).subscribe({
                next: (res) => {
                  const schedule = Array.isArray(res.data) ? res.data : res.data?.content ?? [];
                  this.contractSchedule = schedule;
                  this.nextDuePayment = this.pickNextDue(schedule);
                }
              });
            }
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  get currentRequests(): MaintenanceRequest[] {
    return this.filteredRequests.filter((r) => ACTIVE_STATUSES.has(r.status));
  }

  get previousRequests(): MaintenanceRequest[] {
    return this.filteredRequests.filter((r) => !ACTIVE_STATUSES.has(r.status));
  }

  get selectedUnitRequests(): MaintenanceRequest[] {
    if (!this.selectedUnitId) return [];
    return this.requests
      .filter((r) => r.unitId === this.selectedUnitId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  get latestMaintenanceRequest(): MaintenanceRequest | null {
    return this.selectedUnitRequests[0] ?? null;
  }

  get latestMaintenanceVisit(): MaintenanceRequest | null {
    return this.selectedUnitRequests
      .filter((r) => !!r.scheduledDate)
      .sort((a, b) => new Date(b.scheduledDate || '').getTime() - new Date(a.scheduledDate || '').getTime())[0] ?? null;
  }

  get latestAcceptedRentPayment(): RentPaymentSchedule | null {
    return this.contractSchedule
      .filter((row) => row.status === 'PAID' || row.status === 'PARTIAL')
      .sort((a, b) => this.paymentSortTime(b) - this.paymentSortTime(a))[0] ?? null;
  }

  get latestAcceptedRentPaymentDate(): string | null {
    const payment = this.latestAcceptedRentPayment;
    return payment?.settlementPaymentDate ?? payment?.proofPaymentDate ?? payment?.dueDate ?? null;
  }

  get latestAcceptedRentReviewedAt(): string | null {
    const payment = this.latestAcceptedRentPayment;
    return payment?.reviewedAt ?? payment?.settlementPaymentDate ?? payment?.proofSubmittedAt ?? null;
  }

  get latestAcceptedRentReviewer(): string {
    const payment = this.latestAcceptedRentPayment;
    return payment?.reviewedByName || payment?.recordedByName || payment?.proofSubmittedByName || '-';
  }

  get selectedUnitComplaints(): TenantComplaint[] {
    if (!this.selectedUnitId) return [];
    return this.complaints
      .filter((complaint) => complaint.unitId === this.selectedUnitId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  get latestUnitComplaint(): TenantComplaint | null {
    return this.selectedUnitComplaints[0] ?? null;
  }

  get filteredRequests(): MaintenanceRequest[] {
    if (!this.selectedUnitId) return [];
    const q = this.requestSearchTerm.trim().toLowerCase();
    return this.requests.filter((r) => {
      if (r.unitId !== this.selectedUnitId) return false;
      if (this.statusFilter && r.status !== this.statusFilter) return false;
      if (!q) return true;
      return [
        r.requestNumber,
        r.title,
        r.description,
        r.propertyName,
        r.unitNumber,
        r.assignedOfficerName
      ].join(' ').toLowerCase().includes(q);
    });
  }

  get pagedRequests(): MaintenanceRequest[] {
    const start = this.requestPageIndex * this.requestPageSize;
    return this.filteredRequests.slice(start, start + this.requestPageSize);
  }

  onRequestSearch(value: string): void {
    this.requestSearchTerm = value;
    this.requestPageIndex = 0;
  }

  setStatusFilter(val: string | null): void {
    this.statusFilter = val;
    this.requestPageIndex = 0;
  }

  clearRequestFilters(): void {
    this.requestSearchTerm = '';
    this.statusFilter = null;
    this.requestPageIndex = 0;
  }

  get hasRequestFilters(): boolean {
    return !!this.requestSearchTerm.trim() || !!this.statusFilter;
  }

  requestCountForStatus(status: string | null): number {
    return this.requests.filter((r) => {
      if (!this.selectedUnitId || r.unitId !== this.selectedUnitId) return false;
      return status ? r.status === status : true;
    }).length;
  }

  statusOptionLabel(opt: { labelAr: string; labelEn: string }): string {
    return this.i18n.currentLang === 'ar' ? opt.labelAr : opt.labelEn;
  }

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  get activeContract(): LeaseContract | null {
    if (this.selectedUnitId) {
      return this.selectableContracts.find((c) => c.unitId === this.selectedUnitId) ?? null;
    }
    return null;
  }

  get selectableContracts(): LeaseContract[] {
    return this.contracts.filter((c) => c.status === 'ACTIVE');
  }

  get uniqueUnits(): Array<{ unitId: number; unitNumber: string; propertyName: string }> {
    const seen = new Map<number, { unitId: number; unitNumber: string; propertyName: string }>();
    for (const c of this.selectableContracts) {
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

  get unitDropdownItems(): SearchDropdownItem[] {
    return this.uniqueUnits.map((unit) => ({
      label: `${unit.unitNumber} - ${unit.propertyName}`,
      subLabel: this.i18n.currentLang === 'ar' ? 'وحدة مرتبطة بعقدك' : 'Unit linked to your contract',
      data: unit
    }));
  }

  get activeUnitLabel(): string {
    const c = this.activeContract;
    if (!c) return this.i18n.currentLang === 'ar' ? 'اختر وحدة...' : 'Choose a unit...';
    return `${c.unitNumber || '-'} - ${c.propertyName || '-'}`;
  }

  get unitHeroStyle(): string | null {
    const imageUrl = this.activeContract?.propertyCoverImageUrl?.trim();
    if (!imageUrl) return null;
    return `linear-gradient(180deg, rgba(17, 22, 29, 0.08), rgba(17, 22, 29, 0.7)), url("${imageUrl}")`;
  }

  onUnitChange(unitId: number): void {
    this.selectedUnitId = unitId;
    this.requestSearchTerm = '';
    this.statusFilter = null;
    this.requestPageIndex = 0;
    const contract = this.activeContract;
    if (contract) {
      this.portalSvc.getTenantContractSchedule(contract.id, { page: 0, size: 50 }).subscribe({
        next: (res) => {
          const rows = Array.isArray(res.data) ? res.data : res.data?.content ?? [];
          this.contractSchedule = rows;
          this.nextDuePayment = this.pickNextDue(rows);
        }
      });
    } else {
      this.contractSchedule = [];
      this.nextDuePayment = null;
    }
  }

  onUnitDropdownSelect(unit: { unitId: number } | null): void {
    if (!unit?.unitId) return;
    this.onUnitChange(unit.unitId);
  }

  statusFilterIcon(status: string | null): string {
    const icons: Record<string, string> = {
      PENDING: 'hourglass_empty',
      ASSIGNED: 'assignment_ind',
      SCHEDULED: 'event',
      IN_PROGRESS: 'construction',
      NEEDS_REVISIT: 'replay',
      COMPLETED: 'task_alt',
      CANCELLED: 'cancel'
    };
    return status ? icons[status] ?? 'info' : 'apps';
  }

  get unitsCount(): number {
    return new Set(this.selectableContracts.map((c) => c.unitId)).size;
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

  complaintStatusLabel(status: string): string {
    const isAr = this.i18n.currentLang === 'ar';
    const map: Record<string, { ar: string; en: string }> = {
      OPEN: { ar: 'مفتوحة', en: 'Open' },
      IN_REVIEW: { ar: 'قيد المراجعة', en: 'In review' },
      RESOLVED: { ar: 'محلولة', en: 'Resolved' },
      CLOSED: { ar: 'مغلقة', en: 'Closed' }
    };
    const label = map[status];
    return label ? (isAr ? label.ar : label.en) : status;
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

  private paymentSortTime(row: RentPaymentSchedule): number {
    return new Date(row.reviewedAt ?? row.settlementPaymentDate ?? row.proofPaymentDate ?? row.dueDate).getTime();
  }
}
