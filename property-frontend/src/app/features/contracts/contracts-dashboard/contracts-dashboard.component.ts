import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ContractDialogComponent } from '../contract-dialog/contract-dialog.component';
import { MaintenanceContractDialogComponent } from '../maintenance-contract-dialog/maintenance-contract-dialog.component';
import { ContractTypeChoiceDialogComponent } from '../contract-type-choice-dialog/contract-type-choice-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { PermissionService } from '../../../core/services/permission.service';
import { catchError, forkJoin, of } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ContractSummary, TenantComplaint } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ComplaintService } from '../../../core/services/complaint.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type DashboardCardKey =
  | 'active-rental'
  | 'cancelled-rental'
  | 'rental-expiring'
  | 'active-maintenance'
  | 'cancelled-maintenance'
  | 'maintenance-expiring'
  | 'drafts'
  | 'maintenance-pending'
  | 'overdue'
  | 'open-complaints';

interface ContractsKpiCard {
  key: DashboardCardKey;
  variant: string;
  icon: string;
  value: number;
  labelKey: string;
}

interface DashboardDrillRow {
  id: number;
  ref: string;
  primary: string;
  secondary: string;
  meta: string;
  detailRoute: string[];
}

@Component({
  selector: 'app-contracts-dashboard',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    NgFor,
    DecimalPipe,
    DatePipe,
    RouterLink,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    PageHeaderComponent,
    TablePagerComponent,
    EmptyStateComponent
  ],
  templateUrl: './contracts-dashboard.component.html',
  styleUrl: './contracts-dashboard.component.scss'
})
export class ContractsDashboardComponent implements OnInit {
  loading = true;

  stats = {
    activeRentalContracts: 0,
    cancelledRentalContracts: 0,
    rentalExpiringIn30Days: 0,
    activeMaintenanceContracts: 0,
    cancelledMaintenanceContracts: 0,
    maintenanceExpiringIn30Days: 0,
    draftContracts: 0,
    maintenancePendingApproval: 0,
    overduePayments: 0,
    openComplaints: 0
  };

  private leaseContracts: any[] = [];
  private maintenanceContracts: MaintenanceContractResponse[] = [];
  private rentalExpiring: ContractSummary[] = [];
  private maintenanceDrafts: MaintenanceContractResponse[] = [];
  private maintenancePendingTerm: MaintenanceContractResponse[] = [];
  private maintenancePendingRenew: MaintenanceContractResponse[] = [];
  private overduePayments: any[] = [];
  private openComplaints: TenantComplaint[] = [];

  selectedCardKey: DashboardCardKey | null = null;
  drillRows: DashboardDrillRow[] = [];
  readonly drillPageSize = 5;
  drillPageIndex = 0;

  constructor(
    private readonly dashSvc: DashboardService,
    private readonly contractSvc: ContractService,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly paymentSvc: PaymentService,
    private readonly complaintSvc: ComplaintService,
    private readonly dialog: MatDialog,
    readonly permissions: PermissionService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  get kpiCards(): ContractsKpiCard[] {
    return [
      { key: 'active-rental', variant: 'navy', icon: 'description', value: this.stats.activeRentalContracts, labelKey: 'CONTRACTS.ACTIVE_RENTAL_CONTRACTS' },
      { key: 'cancelled-rental', variant: 'danger', icon: 'block', value: this.stats.cancelledRentalContracts, labelKey: 'CONTRACTS.CANCELLED_RENTAL_CONTRACTS' },
      { key: 'rental-expiring', variant: 'gold', icon: 'schedule', value: this.stats.rentalExpiringIn30Days, labelKey: 'CONTRACTS.RENTAL_EXPIRING_30_DAYS' },
      { key: 'active-maintenance', variant: 'teal', icon: 'engineering', value: this.stats.activeMaintenanceContracts, labelKey: 'CONTRACTS.ACTIVE_MAINTENANCE_CONTRACTS' },
      { key: 'cancelled-maintenance', variant: 'danger', icon: 'do_not_disturb_on', value: this.stats.cancelledMaintenanceContracts, labelKey: 'CONTRACTS.CANCELLED_MAINTENANCE_CONTRACTS' },
      { key: 'maintenance-expiring', variant: 'gold', icon: 'pending_actions', value: this.stats.maintenanceExpiringIn30Days, labelKey: 'CONTRACTS.MAINTENANCE_EXPIRING_30_DAYS' },
      { key: 'drafts', variant: 'purple', icon: 'edit_note', value: this.stats.draftContracts, labelKey: 'CONTRACTS.DRAFT_CONTRACTS' },
      { key: 'maintenance-pending', variant: 'gold', icon: 'how_to_reg', value: this.stats.maintenancePendingApproval, labelKey: 'CONTRACTS.MAINTENANCE_PENDING_APPROVAL' },
      { key: 'overdue', variant: 'danger', icon: 'payment', value: this.stats.overduePayments, labelKey: 'CONTRACTS.OVERDUE_PAYMENTS' },
      { key: 'open-complaints', variant: 'teal', icon: 'chat_bubble_outline', value: this.stats.openComplaints, labelKey: 'CONTRACTS.OPEN_COMPLAINTS' }
    ];
  }

  get pagedDrillRows(): DashboardDrillRow[] {
    const start = this.drillPageIndex * this.drillPageSize;
    return this.drillRows.slice(start, start + this.drillPageSize);
  }

  get selectedCardLabel(): string {
    const card = this.kpiCards.find(c => c.key === this.selectedCardKey);
    return card ? this.i18n.instant(card.labelKey) : '';
  }

  get drillCol2Header(): string {
    switch (this.selectedCardKey) {
      case 'active-maintenance':
      case 'cancelled-maintenance':
      case 'maintenance-expiring':
      case 'maintenance-pending':
        return 'CONTRACTS.CONTRACTOR_COMPANY';
      case 'open-complaints':
        return 'CONTRACTS.TITLE';
      case 'overdue':
        return 'OVERDUE.TENANT_COL';
      default:
        return 'CONTRACTS.TENANT';
    }
  }

  get drillCol3Header(): string {
    if (this.selectedCardKey === 'overdue') {
      return 'OVERDUE.UNIT_COL';
    }
    if (this.selectedCardKey === 'open-complaints') {
      return 'CONTRACTS.TENANT';
    }
    return 'CONTRACTS.PROPERTY';
  }

  get drillCol4Header(): string {
    switch (this.selectedCardKey) {
      case 'overdue':
        return 'OVERDUE.DUE_DATE_COL';
      case 'open-complaints':
        return 'CONTRACTS.STATUS';
      case 'rental-expiring':
      case 'maintenance-expiring':
        return 'CONTRACTS.END_DATE';
      default:
        return 'CONTRACTS.PERIOD';
    }
  }

  selectCard(card: ContractsKpiCard): void {
    this.selectedCardKey = card.key;
    this.drillPageIndex = 0;
    this.drillRows = this.buildDrillRows(card.key);
  }

  private loadDashboardData(): void {
    this.loading = true;

    forkJoin({
      all: this.contractSvc.getAll({ size: 500 }).pipe(catchError(() => of(null))),
      maintenanceDrafts: this.maintenanceContractSvc.getOwnerDrafts().pipe(catchError(() => of(null))),
      maintenanceTerm: this.maintenanceContractSvc.getOwnerPendingTerminations().pipe(catchError(() => of(null))),
      maintenanceRenew: this.maintenanceContractSvc.getOwnerPendingRenewals().pipe(catchError(() => of(null))),
      maintenanceAll: this.maintenanceContractSvc.listAll().pipe(catchError(() => of(null))),
      expiring: this.contractSvc.getExpiring(30).pipe(catchError(() => of(null))),
      overdue: this.paymentSvc.getOverdue().pipe(catchError(() => of(null))),
      complaints: this.complaintSvc.getAll({ page: 0, size: 500 }).pipe(catchError(() => of(null))),
      dash: this.dashSvc.getStats().pipe(catchError(() => of(null)))
    }).subscribe(({ all, maintenanceDrafts, maintenanceTerm, maintenanceRenew, maintenanceAll, expiring, overdue, complaints, dash }) => {
      this.leaseContracts = all?.data?.content ?? all?.data ?? [];
      this.maintenanceDrafts = Array.isArray(maintenanceDrafts?.data) ? maintenanceDrafts!.data! : [];
      this.maintenancePendingTerm = Array.isArray(maintenanceTerm?.data) ? maintenanceTerm!.data! : [];
      this.maintenancePendingRenew = Array.isArray(maintenanceRenew?.data) ? maintenanceRenew!.data! : [];
      this.maintenanceContracts = Array.isArray(maintenanceAll?.data) ? maintenanceAll!.data! : [];
      this.rentalExpiring = expiring?.data?.content ?? expiring?.data ?? [];
      this.overduePayments = Array.isArray(overdue?.data) ? overdue!.data! : (overdue?.data?.content ?? []);
      const complaintPayload = complaints?.data?.content ?? complaints?.data ?? [];
      this.openComplaints = (Array.isArray(complaintPayload) ? complaintPayload : []).filter(
        (c: TenantComplaint) => c.status === 'OPEN' || c.status === 'IN_REVIEW'
      );

      this.stats.activeRentalContracts = this.leaseContracts.filter(c => c.status === 'ACTIVE').length;
      this.stats.cancelledRentalContracts = this.leaseContracts.filter(c => c.status === 'CANCELLED').length;
      this.stats.rentalExpiringIn30Days = this.rentalExpiring.length;
      this.stats.activeMaintenanceContracts = this.maintenanceContracts.filter(c => c.status === 'ACTIVE').length;
      this.stats.cancelledMaintenanceContracts = this.maintenanceContracts.filter(c => c.status === 'CANCELLED').length;
      this.stats.maintenanceExpiringIn30Days = this.maintenanceContracts.filter(c => this.isExpiringWithinDays(c.endDate, 30)).length;
      this.stats.draftContracts = this.leaseContracts.filter(c => c.status === 'DRAFT').length + this.maintenanceDrafts.length;
      this.stats.maintenancePendingApproval = this.maintenanceDrafts.length + this.maintenancePendingTerm.length + this.maintenancePendingRenew.length;
      this.stats.overduePayments = dash?.data?.overduePayments ?? this.overduePayments.length;
      this.stats.openComplaints = dash?.data?.openComplaints ?? this.openComplaints.length;

      if (this.selectedCardKey) {
        this.drillRows = this.buildDrillRows(this.selectedCardKey);
        this.drillPageIndex = 0;
      }

      this.loading = false;
    });
  }

  private buildDrillRows(key: DashboardCardKey): DashboardDrillRow[] {
    switch (key) {
      case 'active-rental':
        return this.leaseContracts.filter(c => c.status === 'ACTIVE').map(c => this.leaseRow(c));
      case 'cancelled-rental':
        return this.leaseContracts.filter(c => c.status === 'CANCELLED').map(c => this.leaseRow(c));
      case 'rental-expiring':
        return this.rentalExpiring.map(c => this.expiringLeaseRow(c));
      case 'active-maintenance':
        return this.maintenanceContracts.filter(c => c.status === 'ACTIVE').map(c => this.maintenanceRow(c));
      case 'cancelled-maintenance':
        return this.maintenanceContracts.filter(c => c.status === 'CANCELLED').map(c => this.maintenanceRow(c));
      case 'maintenance-expiring':
        return this.maintenanceContracts
          .filter(c => this.isExpiringWithinDays(c.endDate, 30))
          .map(c => this.maintenanceRow(c, c.endDate ? this.formatDate(c.endDate) : '—'));
      case 'drafts':
        return [
          ...this.leaseContracts.filter(c => c.status === 'DRAFT').map(c => this.leaseRow(c)),
          ...this.maintenanceDrafts.map(c => this.maintenanceRow(c))
        ];
      case 'maintenance-pending':
        return [
          ...this.maintenanceDrafts.map(c => this.maintenanceRow(c, this.i18n.instant('CONTRACTS.STATUS_DRAFT'))),
          ...this.maintenancePendingTerm.map(c => this.maintenanceRow(c, this.i18n.instant('CONTRACTS.STATUS_PENDING_TERMINATION_APPROVAL'))),
          ...this.maintenancePendingRenew.map(c => this.maintenanceRow(c, this.i18n.instant('CONTRACTS.STATUS_PENDING_RENEWAL_APPROVAL')))
        ];
      case 'overdue':
        return this.overduePayments.map(item => this.overdueRow(item));
      case 'open-complaints':
        return this.openComplaints.map(c => this.complaintRow(c));
      default:
        return [];
    }
  }

  private leaseRow(c: any): DashboardDrillRow {
    return {
      id: c.id,
      ref: c.contractNumber || `#${c.id}`,
      primary: c.tenantName || '—',
      secondary: this.propertyUnitLabel(c.propertyName, c.unitNumber),
      meta: this.formatPeriod(c.startDate, c.endDate),
      detailRoute: ['/admin/contracts', String(c.id)]
    };
  }

  private expiringLeaseRow(c: ContractSummary): DashboardDrillRow {
    const daysLeft = c.daysUntilExpiry != null
      ? `${c.daysUntilExpiry} ${this.i18n.instant('CONTRACTS.DAYS_LEFT')}`
      : this.formatDate(c.endDate);
    return {
      id: c.id,
      ref: c.contractNumber || `#${c.id}`,
      primary: c.tenantName || '—',
      secondary: this.propertyUnitLabel(c.propertyName, c.unitNumber),
      meta: daysLeft,
      detailRoute: ['/admin/contracts', String(c.id)]
    };
  }

  private maintenanceRow(c: MaintenanceContractResponse, metaOverride?: string): DashboardDrillRow {
    return {
      id: c.contractId,
      ref: c.contractNumber,
      primary: this.maintenanceCompanyLabel(c),
      secondary: this.maintenancePropertyLabel(c),
      meta: metaOverride ?? (c.endDate ? this.formatPeriod(c.startDate, c.endDate) : this.statusLabel(c.status, 'MAINTENANCE')),
      detailRoute: ['/admin/contracts/maintenance', String(c.contractId)]
    };
  }

  private overdueRow(item: any): DashboardDrillRow {
    return {
      id: item.scheduleId ?? item.id ?? item.contractId,
      ref: item.contractNumber ? item.contractNumber : `#${item.contractId}`,
      primary: item.tenantName || '—',
      secondary: item.unitNumber || '—',
      meta: item.dueDate ? this.formatDate(item.dueDate) : '—',
      detailRoute: ['/admin/contracts', String(item.contractId)]
    };
  }

  private complaintRow(c: TenantComplaint): DashboardDrillRow {
    return {
      id: c.id,
      ref: `#${c.id}`,
      primary: c.title || '—',
      secondary: c.tenantName || c.propertyName || '—',
      meta: this.complaintStatusLabel(c.status),
      detailRoute: ['/admin/contracts/complaints']
    };
  }

  private maintenanceCompanyLabel(c: MaintenanceContractResponse): string {
    const ar = this.i18n.currentLang === 'ar';
    return ar
      ? (c.contractorCompanyNameAr || c.contractorCompanyNameEn || c.contractorCompanyName || '—')
      : (c.contractorCompanyNameEn || c.contractorCompanyNameAr || c.contractorCompanyName || '—');
  }

  private maintenancePropertyLabel(c: MaintenanceContractResponse): string {
    const ar = this.i18n.currentLang === 'ar';
    return ar
      ? (c.propertyNameAr || c.propertyNameEn || c.propertyName || c.propertyCode || '—')
      : (c.propertyNameEn || c.propertyNameAr || c.propertyName || c.propertyCode || '—');
  }

  private propertyUnitLabel(propertyName?: string | null, unitNumber?: string | null): string {
    const parts = [propertyName, unitNumber].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }

  private formatPeriod(startDate?: string | null, endDate?: string | null): string {
    if (!startDate && !endDate) return '—';
    const start = startDate ? this.formatDate(startDate) : '—';
    const end = endDate ? this.formatDate(endDate) : '—';
    return `${start} → ${end}`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private statusLabel(status: string, source: 'LEASE' | 'MAINTENANCE'): string {
    const ar = this.i18n.currentLang === 'ar';
    const labelsAr: Record<string, string> = {
      DRAFT: 'مسودة عقد',
      PENDING_OWNER_APPROVAL: 'عقد جديد بانتظار المالك',
      PENDING_TERMINATION_APPROVAL: 'طلب إلغاء بانتظار المالك',
      PENDING_RENEWAL_APPROVAL: 'طلب تجديد بانتظار المالك',
      ACTIVE: 'عقد نشط',
      EXPIRED: source === 'MAINTENANCE' ? 'انتهاء عقد الصيانة' : 'انتهاء عقد الإيجار',
      TERMINATED: source === 'MAINTENANCE' ? 'إلغاء عقد الصيانة' : 'إلغاء عقد الإيجار',
      CANCELLED: 'إلغاء مسودة العقد',
      RENEWED: 'تم تجديد العقد'
    };
    const labelsEn: Record<string, string> = {
      DRAFT: 'Draft contract',
      PENDING_OWNER_APPROVAL: 'New contract pending owner',
      PENDING_TERMINATION_APPROVAL: 'Cancellation pending owner',
      PENDING_RENEWAL_APPROVAL: 'Renewal pending owner',
      ACTIVE: 'Active contract',
      EXPIRED: source === 'MAINTENANCE' ? 'Maintenance contract expired' : 'Lease contract expired',
      TERMINATED: source === 'MAINTENANCE' ? 'Maintenance contract cancelled' : 'Lease contract cancelled',
      CANCELLED: 'Draft contract cancelled',
      RENEWED: 'Contract renewed'
    };
    return (ar ? labelsAr : labelsEn)[status] ?? status;
  }

  private complaintStatusLabel(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'CONTRACTS.COMP_STATUS_OPEN',
      IN_REVIEW: 'CONTRACTS.COMP_STATUS_IN_REVIEW',
      RESOLVED: 'CONTRACTS.COMP_STATUS_RESOLVED',
      CLOSED: 'CONTRACTS.COMP_STATUS_CLOSED'
    };
    const key = map[status];
    return key ? this.i18n.instant(key) : status;
  }

  private isExpiringWithinDays(endDate: string | null | undefined, days: number): boolean {
    if (!endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + days);
    const expiry = new Date(endDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry >= today && expiry <= cutoff;
  }

  openContractDialog(): void {
    this.dialog.open(ContractTypeChoiceDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((contractType: 'rental' | 'maintenance' | null) => {
      if (contractType === 'rental') {
        this.openRentalContractDialog();
      } else if (contractType === 'maintenance') {
        this.openMaintenanceContractDialog();
      }
    });
  }

  private openRentalContractDialog(): void {
    this.dialog.open(ContractDialogComponent, {
      width: '980px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadDashboardData();
    });
  }

  canCreateMaintenanceContract(): boolean {
    return this.permissions.can('contracts', 'create');
  }

  openMaintenanceContractDialog(): void {
    this.dialog.open(MaintenanceContractDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { mode: 'create' }
    }).afterClosed().subscribe((saved) => {
      if (saved) this.loadDashboardData();
    });
  }

  loadData(): void {
    this.loadDashboardData();
  }
}
