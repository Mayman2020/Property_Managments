import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, forkJoin, map, of, switchMap } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContractFormComponent } from '../contract-form/contract-form.component';
import { MaintenanceContractDialogComponent } from '../maintenance-contract-dialog/maintenance-contract-dialog.component';
import { ContractTypeChoiceDialogComponent } from '../contract-type-choice-dialog/contract-type-choice-dialog.component';

import { I18nService } from '../../../core/i18n/i18n.service';
import { ContractSummary, ContractStatus } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';
import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableRowIndexPipe } from '../../../shared/pipes/table-row-index.pipe';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListLoadController } from '../../../shared/utils/list-load.util';

type ContractTypeFilter = '' | 'LEASE' | 'MAINTENANCE';

interface UnifiedContractRow {
  id: number;
  source: 'LEASE' | 'MAINTENANCE';
  contractNumber: string;
  partyName: string;
  tenantName: string;
  unitNumber?: string | null;
  propertyName?: string | null;
  startDate: string;
  endDate?: string | null;
  amount?: number | null;
  monthlyRent?: number | null;
  currency: string;
  status: string;
  ownerApprovalStatus?: string | null;
  createdAt?: string | null;
}

@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    NgClass,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule,
    PageHeaderComponent,
    TablePagerComponent,
    EmptyStateComponent,
    TableRowIndexPipe,
    EstateLovSelectComponent
  ],
  templateUrl: './contract-list.component.html',
  styleUrl: './contract-list.component.scss'
})
export class ContractListComponent implements OnInit {
  listLoad = new ListLoadController();
  contracts: UnifiedContractRow[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;

  filterStatus = '';
  filterType: ContractTypeFilter = '';
  searchQuery = '';
  private readonly search$ = new Subject<void>();

  displayedColumns = ['contractNumber', 'tenant', 'unit', 'dates', 'rent', 'status', 'actions'];
  statusOptions = ['DRAFT', 'PENDING_OWNER_APPROVAL', 'PENDING_TERMINATION_APPROVAL', 'PENDING_RENEWAL_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'ENDED', 'CANCELLED', 'RENEWED', 'OWNER_REJECTED'];

  get statusLovOptions(): EstateLovOption[] {
    return [
      { value: '', label: this.i18n.instant('COMMON.ALL') },
      ...this.statusOptions.map((s) => ({ value: s, label: this.statusLabel(s) }))
    ];
  }

  get contractTypeLovOptions(): EstateLovOption[] {
    return [
      { value: '', label: this.i18n.instant('INLINE_TEXT.ALL_CONTRACT_TYPES') },
      { value: 'LEASE', label: this.i18n.instant('INLINE_TEXT.LEASE_CONTRACTS') },
      { value: 'MAINTENANCE', label: this.i18n.instant('INLINE_TEXT.MAINTENANCE_CONTRACTS') }
    ];
  }

  constructor(
    private readonly contractSvc: ContractService,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly dialog: MatDialog,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly i18n: I18nService,
    private readonly permissions: PermissionService,
    private readonly auth: AuthService,
    private readonly snack: SnackService
  ) {}

  canCreateContract(): boolean {
    return this.permissions.can('contracts', 'create');
  }

  canCreateMaintenanceContract(): boolean {
    return this.permissions.can('maintenance', 'create');
  }

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    // Pre-select status filter from query param (e.g. ?status=ACTIVE from dashboard KPI cards)
    const qStatus = this.route.snapshot.queryParamMap.get('status');
    if (qStatus && this.statusOptions.includes(qStatus)) {
      this.filterStatus = qStatus;
    }
    const qType = this.route.snapshot.queryParamMap.get('type');
    if (qType === 'LEASE' || qType === 'MAINTENANCE') {
      this.filterType = qType;
    }

    this.search$.pipe(
      debounceTime(300),
      switchMap(() => {
        this.listLoad.begin();
        return this.buildQuery();
      })
    ).subscribe({
      next: (res) => this.handleResponse(res),
      error: () => this.listLoad.end()
    });

    this.loadContracts();

    const openDialog = this.route.snapshot.queryParamMap.get('openDialog');
    if (openDialog === '1' && this.filterType === 'MAINTENANCE' && this.canCreateMaintenanceContract()) {
      queueMicrotask(() => this.openMaintenanceCreateFromRoute());
    }
  }

  /** Opens create-maintenance dialog from query (e.g. property form / dashboard) then strips `openDialog`. */
  private openMaintenanceCreateFromRoute(): void {
    const propertyIdRaw = this.route.snapshot.queryParamMap.get('propertyId');
    const propertyId = propertyIdRaw ? Number(propertyIdRaw) : undefined;
    const companyIdRaw = this.route.snapshot.queryParamMap.get('contractorCompanyId');
    const contractorCompanyId = companyIdRaw ? Number(companyIdRaw) : undefined;

    this.dialog.open(MaintenanceContractDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: {
        propertyId: Number.isFinite(propertyId) ? propertyId : undefined,
        contractorCompanyId: Number.isFinite(contractorCompanyId) ? contractorCompanyId : undefined,
        mode: 'create'
      }
    }).afterClosed().subscribe((saved) => {
      if (saved) this.loadContracts();
    });

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openDialog: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loadContracts(): void {
    this.listLoad.begin();
    this.buildQuery().subscribe({
      next: (res) => this.handleResponse(res),
      error: () => this.listLoad.end()
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadContracts();
  }

  goToPage(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.loadContracts();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadContracts();
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.search$.next();
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterType = '';
    this.searchQuery = '';
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return !!this.searchQuery.trim() || !!this.filterStatus || !!this.filterType;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-success',
      DRAFT: 'chip-default',
      PENDING_OWNER_APPROVAL: 'chip-warn',
      PENDING_TERMINATION_APPROVAL: 'chip-warn',
      PENDING_RENEWAL_APPROVAL: 'chip-warn',
      EXPIRED: 'chip-danger',
      ENDED: 'chip-danger',
      CANCELLED: 'chip-danger',
      TERMINATED: 'chip-danger',
      RENEWED: 'chip-info',
      OWNER_REJECTED: 'chip-danger'
    };
    return map[status] ?? 'chip-default';
  }

  getStatusCount(status: ContractStatus): number {
    return this.contracts.filter((contract) => contract.status === status).length;
  }

  /** Status chip key for list rows (owner-rejected drafts are labelled distinctly). */
  displayStatusKey(row: UnifiedContractRow): string {
    if (row.ownerApprovalStatus === 'REJECTED') {
      return 'OWNER_REJECTED';
    }
    return row.status;
  }

  contractTypeLabel(row: UnifiedContractRow): string {
    if (row.source === 'MAINTENANCE') {
      return this.i18n.instant('INLINE_TEXT.MAINTENANCE');
    }
    return this.i18n.instant('INLINE_TEXT.LEASE');
  }

  partyHeader(): string {
    return this.i18n.instant('INLINE_TEXT.PARTY');
  }

  statusLabel(status: string, source?: UnifiedContractRow['source']): string {
    const ar = this.i18n.currentLang === 'ar';
    const labelsAr: Record<string, string> = {
      DRAFT: 'مسودة عقد',
      PENDING_OWNER_APPROVAL: 'عقد جديد بانتظار المالك',
      PENDING_TERMINATION_APPROVAL: 'طلب إلغاء بانتظار المالك',
      PENDING_RENEWAL_APPROVAL: 'طلب تجديد بانتظار المالك',
      ACTIVE: 'عقد نشط',
      EXPIRED: source === 'MAINTENANCE' ? 'انتهاء عقد الصيانة' : 'انتهاء عقد الإيجار',
      TERMINATED: source === 'MAINTENANCE' ? 'إلغاء عقد الصيانة' : 'إلغاء عقد الإيجار',
      ENDED: source === 'LEASE' ? 'انتهاء عقد الإيجار' : 'انتهاء عقد الصيانة',
      CANCELLED: 'إلغاء مسودة العقد',
      OWNER_REJECTED: 'مرفوض من المالك',
      RENEWED: 'تم تجديد العقد',
    };
    const labelsEn: Record<string, string> = {
      DRAFT: 'Draft contract',
      PENDING_OWNER_APPROVAL: 'New contract pending owner',
      PENDING_TERMINATION_APPROVAL: 'Cancellation pending owner',
      PENDING_RENEWAL_APPROVAL: 'Renewal pending owner',
      ACTIVE: 'Active contract',
      EXPIRED: source === 'MAINTENANCE' ? 'Maintenance contract expired' : 'Lease contract expired',
      TERMINATED: source === 'MAINTENANCE' ? 'Maintenance contract cancelled' : 'Lease contract cancelled',
      ENDED: source === 'LEASE' ? 'Lease contract ended' : 'Maintenance contract ended',
      CANCELLED: 'Draft contract cancelled',
      OWNER_REJECTED: 'Rejected by owner',
      RENEWED: 'Contract renewed',
    };
    return (ar ? labelsAr : labelsEn)[status] ?? this.i18n.instant(`CONTRACTS.STATUS_${status}`);
  }

  openAddDialog(): void {
    this.dialog.open(ContractTypeChoiceDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { allowMaintenance: this.canCreateMaintenanceContract() }
    }).afterClosed().subscribe((contractType: 'rental' | 'maintenance' | null) => {
      if (contractType === 'rental') {
        this.openLeaseContractDialog();
      } else if (contractType === 'maintenance') {
        this.openMaintenanceContractDialog();
      }
    });
  }

  private openLeaseContractDialog(): void {
    this.dialog.open(ContractFormComponent, {
      width: '980px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadContracts();
    });
  }

  private openMaintenanceContractDialog(): void {
    if (!this.canCreateMaintenanceContract()) {
      this.snack.error(this.i18n.instant('COMMON.ACCESS_DENIED'));
      return;
    }

    const propertyIdRaw = this.route.snapshot.queryParamMap.get('propertyId');
    const propertyId = propertyIdRaw ? Number(propertyIdRaw) : undefined;
    const companyIdRaw = this.route.snapshot.queryParamMap.get('contractorCompanyId');
    const contractorCompanyId = companyIdRaw ? Number(companyIdRaw) : undefined;

    this.dialog.open(MaintenanceContractDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: {
        propertyId: Number.isFinite(propertyId) ? propertyId : undefined,
        contractorCompanyId: Number.isFinite(contractorCompanyId) ? contractorCompanyId : undefined,
        mode: 'create'
      }
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadContracts();
    });
  }

  approveMaintenance(row: UnifiedContractRow): void {
    this.maintenanceContractSvc.decideDraft(row.id, 'APPROVED').subscribe({
      next: () => { this.snack.success(this.i18n.instant('CONTRACTS.ACTIVATED_SUCCESS')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  rejectMaintenance(row: UnifiedContractRow): void {
    const reason = window.prompt(this.i18n.instant('INLINE_TEXT.REJECTION_REASON'));
    if (!reason) return;
    this.maintenanceContractSvc.decideDraft(row.id, 'REJECTED', reason).subscribe({
      next: () => { this.snack.success(this.i18n.instant('OWNER_PORTAL.REJECT_OK')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  requestMaintenanceTermination(row: UnifiedContractRow): void {
    const terminationDate = window.prompt(this.i18n.instant('INLINE_TEXT.TERMINATION_DATE_YYYY_MM_DD'));
    if (!terminationDate) return;
    const reason = window.prompt(this.i18n.instant('INLINE_TEXT.TERMINATION_REASON')) ?? '';
    this.maintenanceContractSvc.terminate(row.id, { terminationDate, reason }).subscribe({
      next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  requestMaintenanceRenewal(row: UnifiedContractRow): void {
    const proposedStartDate = window.prompt(this.i18n.instant('INLINE_TEXT.RENEWAL_START_YYYY_MM_DD'));
    if (!proposedStartDate) return;
    const proposedEndDate = window.prompt(this.i18n.instant('INLINE_TEXT.RENEWAL_END_YYYY_MM_DD'));
    if (!proposedEndDate) return;
    const proposedValueRaw = window.prompt(this.i18n.instant('INLINE_TEXT.NEW_CONTRACT_VALUE'));
    const note = window.prompt(this.i18n.instant('INLINE_TEXT.NOTE')) ?? '';
    const proposedValue = proposedValueRaw ? Number(proposedValueRaw) : undefined;
    this.maintenanceContractSvc.requestRenewal(row.id, { proposedStartDate, proposedEndDate, proposedValue, note }).subscribe({
      next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  private buildQuery() {
    const q = this.searchQuery.trim() || undefined;
    const { status, ownerApprovalStatus } = this.resolveStatusFilters();
    const page = this.pageIndex;
    const size = this.pageSize;
    const leaseParams: Record<string, string | number | boolean> = { page, size };
    if (status) leaseParams['status'] = status;
    if (ownerApprovalStatus) leaseParams['ownerApprovalStatus'] = ownerApprovalStatus;
    if (q) leaseParams['q'] = q;

    if (this.filterType === 'LEASE') {
      return this.contractSvc.getAll(leaseParams).pipe(
        map((res) => ({
          rows: ((res?.data?.content ?? []) as ContractSummary[]).map((c) => this.mapLeaseRow(c)),
          total: res?.data?.totalElements ?? 0
        })),
        catchError(() => of({ rows: [], total: 0 }))
      );
    }

    if (this.filterType === 'MAINTENANCE') {
      return this.maintenanceContractSvc.getAll(page, size, status, ownerApprovalStatus, q).pipe(
        map((res) => ({
          rows: (res.data?.content ?? []).map((c) => this.mapMaintenanceRow(c)),
          total: res.data?.totalElements ?? 0
        })),
        catchError(() => of({ rows: [], total: 0 }))
      );
    }

    return forkJoin({
      leases: this.contractSvc.getAll(leaseParams).pipe(catchError(() => of(null))),
      maintenance: this.maintenanceContractSvc.getAll(page, size, status, ownerApprovalStatus, q).pipe(catchError(() => of(null)))
    }).pipe(
      map(({ leases, maintenance }) => {
        const leaseRows = ((leases?.data?.content ?? []) as ContractSummary[]).map((c) => this.mapLeaseRow(c));
        const maintenanceRows = (maintenance?.data?.content ?? []).map((c) => this.mapMaintenanceRow(c));
        const merged = [...leaseRows, ...maintenanceRows]
          .sort((a, b) => String(b.createdAt ?? b.startDate).localeCompare(String(a.createdAt ?? a.startDate)))
          .slice(0, size);
        const total = (leases?.data?.totalElements ?? 0) + (maintenance?.data?.totalElements ?? 0);
        return { rows: merged, total };
      })
    );
  }

  private resolveStatusFilters(): { status?: string; ownerApprovalStatus?: string } {
    if (this.filterStatus === 'OWNER_REJECTED') {
      return { ownerApprovalStatus: 'REJECTED' };
    }
    if (this.filterStatus) {
      return { status: this.filterStatus };
    }
    return {};
  }

  private handleResponse(result: { rows: UnifiedContractRow[]; total: number } | null): void {
    this.contracts = result?.rows ?? [];
    this.totalElements = result?.total ?? 0;
    this.listLoad.end();
  }

  private mapLeaseRow(c: ContractSummary): UnifiedContractRow {
    return {
      id: c.id,
      source: 'LEASE',
      contractNumber: c.contractNumber,
      partyName: c.tenantName || '—',
      tenantName: c.tenantName || '—',
      unitNumber: c.unitNumber,
      propertyName: c.propertyName,
      startDate: c.startDate,
      endDate: c.endDate,
      amount: c.monthlyRent,
      monthlyRent: c.monthlyRent,
      currency: c.currency || 'SAR',
      status: c.status,
      ownerApprovalStatus: c.ownerApprovalStatus ?? null,
      createdAt: c.startDate
    };
  }

  private mapMaintenanceRow(c: MaintenanceContractResponse): UnifiedContractRow {
    return {
      id: c.contractId,
      source: 'MAINTENANCE',
      contractNumber: c.contractNumber,
      partyName: this.contractorLabel(c),
      tenantName: this.contractorLabel(c),
      unitNumber: this.i18n.instant('INLINE_TEXT.ALL_PROPERTY_UNITS'),
      propertyName: this.maintenancePropertyLabel(c),
      startDate: c.startDate,
      endDate: c.endDate,
      amount: c.contractValue,
      monthlyRent: c.contractValue,
      currency: 'SAR',
      status: c.status,
      ownerApprovalStatus: c.ownerApprovalStatus ?? null,
      createdAt: c.createdAt
    };
  }

  private maintenancePropertyLabel(c: MaintenanceContractResponse): string {
    const ar = (c.propertyNameAr ?? '').trim();
    const en = (c.propertyNameEn ?? '').trim();
    const fallback = (c.propertyName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${c.propertyId}`)
      : (en || ar || fallback || `#${c.propertyId}`);
  }

  private contractorLabel(c: MaintenanceContractResponse): string {
    const ar = (c.contractorCompanyNameAr ?? '').trim();
    const en = (c.contractorCompanyNameEn ?? '').trim();
    const fallback = (c.contractorCompanyName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${c.contractorCompanyId}`)
      : (en || ar || fallback || `#${c.contractorCompanyId}`);
  }
}

