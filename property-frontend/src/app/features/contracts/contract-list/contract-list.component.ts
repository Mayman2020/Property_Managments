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

import { I18nService } from '../../../core/i18n/i18n.service';
import { ContractSummary, ContractStatus } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';
import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';

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
    EmptyStateComponent
  ],
  templateUrl: './contract-list.component.html',
  styleUrl: './contract-list.component.scss'
})
export class ContractListComponent implements OnInit {
  loading = true;
  contracts: UnifiedContractRow[] = [];
  allRows: UnifiedContractRow[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;

  filterStatus = '';
  filterType: ContractTypeFilter = '';
  searchQuery = '';
  private readonly search$ = new Subject<void>();

  displayedColumns = ['contractNumber', 'tenant', 'unit', 'dates', 'rent', 'status', 'actions'];
  statusOptions = ['DRAFT', 'PENDING_OWNER_APPROVAL', 'PENDING_TERMINATION_APPROVAL', 'PENDING_RENEWAL_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'ENDED', 'CANCELLED', 'RENEWED', 'SUSPENDED'];

  constructor(
    private readonly contractSvc: ContractService,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly i18n: I18nService,
    private readonly permissions: PermissionService,
    private readonly snack: SnackService
  ) {}

  canCreateContract(): boolean {
    return this.permissions.can('contracts', 'create');
  }

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    // Pre-select status filter from query param (e.g. ?status=ACTIVE from dashboard KPI cards)
    const qStatus = this.route.snapshot.queryParamMap.get('status');
    if (qStatus && this.statusOptions.includes(qStatus as ContractStatus)) {
      this.filterStatus = qStatus;
    }
    const qType = this.route.snapshot.queryParamMap.get('type');
    if (qType === 'LEASE' || qType === 'MAINTENANCE') {
      this.filterType = qType;
    }

    this.search$.pipe(
      debounceTime(300),
      switchMap(() => this.buildQuery())
    ).subscribe((res) => this.handleResponse(res));

    this.loadContracts();

    const openDialog = this.route.snapshot.queryParamMap.get('openDialog');
    if (openDialog === '1' && this.filterType === 'MAINTENANCE' && this.canCreateContract()) {
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
    this.loading = true;
    this.buildQuery().subscribe((res) => this.handleResponse(res));
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
      SUSPENDED: 'chip-warn'
    };
    return map[status] ?? 'chip-default';
  }

  getStatusCount(status: ContractStatus): number {
    return this.contracts.filter((contract) => contract.status === status).length;
  }

  contractTypeLabel(row: UnifiedContractRow): string {
    if (row.source === 'MAINTENANCE') {
      return this.i18n.currentLang === 'ar' ? 'صيانة / مقاولين' : 'Maintenance';
    }
    return this.i18n.currentLang === 'ar' ? 'إيجار' : 'Lease';
  }

  partyHeader(): string {
    return this.i18n.currentLang === 'ar' ? 'الطرف' : 'Party';
  }

  statusLabel(status: string): string {
    const fallback: Record<string, string> = {
      ENDED: this.i18n.currentLang === 'ar' ? 'منتهي' : 'Ended'
    };
    return fallback[status] ?? this.i18n.instant(`CONTRACTS.STATUS_${status}`);
  }

  openAddDialog(): void {
    // If viewing maintenance contracts, open maintenance dialog instead
    if (this.filterType === 'MAINTENANCE') {
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
      return;
    }

    // For lease contracts, use the regular contract form
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

  approveMaintenance(row: UnifiedContractRow): void {
    this.maintenanceContractSvc.decideDraft(row.id, 'APPROVED').subscribe({
      next: () => { this.snack.success(this.i18n.instant('CONTRACTS.ACTIVATED_SUCCESS')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  rejectMaintenance(row: UnifiedContractRow): void {
    const reason = window.prompt(this.i18n.currentLang === 'ar' ? 'سبب الرفض' : 'Rejection reason');
    if (!reason) return;
    this.maintenanceContractSvc.decideDraft(row.id, 'REJECTED', reason).subscribe({
      next: () => { this.snack.success(this.i18n.instant('OWNER_PORTAL.REJECT_OK')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  requestMaintenanceTermination(row: UnifiedContractRow): void {
    const terminationDate = window.prompt(this.i18n.currentLang === 'ar' ? 'تاريخ الإنهاء YYYY-MM-DD' : 'Termination date YYYY-MM-DD');
    if (!terminationDate) return;
    const reason = window.prompt(this.i18n.currentLang === 'ar' ? 'سبب الإنهاء' : 'Termination reason') ?? '';
    this.maintenanceContractSvc.terminate(row.id, { terminationDate, reason }).subscribe({
      next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  requestMaintenanceRenewal(row: UnifiedContractRow): void {
    const proposedStartDate = window.prompt(this.i18n.currentLang === 'ar' ? 'بداية التجديد YYYY-MM-DD' : 'Renewal start YYYY-MM-DD');
    if (!proposedStartDate) return;
    const proposedEndDate = window.prompt(this.i18n.currentLang === 'ar' ? 'نهاية التجديد YYYY-MM-DD' : 'Renewal end YYYY-MM-DD');
    if (!proposedEndDate) return;
    const proposedValueRaw = window.prompt(this.i18n.currentLang === 'ar' ? 'قيمة العقد الجديدة' : 'New contract value');
    const note = window.prompt(this.i18n.currentLang === 'ar' ? 'ملاحظة' : 'Note') ?? '';
    const proposedValue = proposedValueRaw ? Number(proposedValueRaw) : undefined;
    this.maintenanceContractSvc.requestRenewal(row.id, { proposedStartDate, proposedEndDate, proposedValue, note }).subscribe({
      next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadContracts(); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  private buildQuery() {
    return forkJoin({
      leases: this.contractSvc.getAll({ page: 0, size: 500 }).pipe(catchError(() => of(null))),
      maintenance: this.maintenanceContractSvc.listAll().pipe(catchError(() => of(null))),
      properties: this.propertySvc.getAll(0, 500).pipe(catchError(() => of(null)))
    }).pipe(
      map(({ leases, maintenance, properties }) => {
        const propertyMap = new Map<number, string>();
        ((properties?.data?.content ?? []) as Property[]).forEach((p) => {
          propertyMap.set(p.id, this.propertyLabel(p));
        });
        const leaseRows = ((leases?.data?.content ?? leases?.data ?? []) as ContractSummary[])
          .map((c) => this.mapLeaseRow(c));
        const maintenanceRows = ((maintenance?.data ?? []) as MaintenanceContractResponse[])
          .map((c) => this.mapMaintenanceRow(c, propertyMap));
        return [...leaseRows, ...maintenanceRows]
          .sort((a, b) => String(b.createdAt ?? b.startDate).localeCompare(String(a.createdAt ?? a.startDate)));
      })
    );
  }

  private handleResponse(rows: UnifiedContractRow[] | null): void {
    this.allRows = rows ?? [];
    const query = this.searchQuery.trim().toLowerCase();
    const filtered = this.allRows.filter((row) => {
      if (this.filterType && row.source !== this.filterType) return false;
      if (this.filterStatus && row.status !== this.filterStatus) return false;
      if (!query) return true;
      return [
        row.contractNumber,
        row.partyName,
        row.propertyName ?? '',
        row.unitNumber ?? '',
        row.status
      ].join(' ').toLowerCase().includes(query);
    });
    this.totalElements = filtered.length;
    const start = this.pageIndex * this.pageSize;
    this.contracts = filtered.slice(start, start + this.pageSize);
    this.loading = false;
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
      currency: c.currency || 'OMR',
      status: c.status,
      createdAt: c.startDate
    };
  }

  private mapMaintenanceRow(c: MaintenanceContractResponse, propertyMap: Map<number, string>): UnifiedContractRow {
    return {
      id: c.contractId,
      source: 'MAINTENANCE',
      contractNumber: c.contractNumber,
      partyName: this.contractorLabel(c),
      tenantName: this.contractorLabel(c),
      unitNumber: this.i18n.currentLang === 'ar' ? 'كل وحدات العقار' : 'All property units',
      propertyName: propertyMap.get(c.propertyId) ?? `#${c.propertyId}`,
      startDate: c.startDate,
      endDate: c.endDate,
      amount: c.contractValue,
      monthlyRent: c.contractValue,
      currency: 'OMR',
      status: c.status,
      createdAt: c.createdAt
    };
  }

  private contractorLabel(c: MaintenanceContractResponse): string {
    const ar = (c.contractorCompanyNameAr ?? '').trim();
    const en = (c.contractorCompanyNameEn ?? '').trim();
    const fallback = (c.contractorCompanyName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${c.contractorCompanyId}`)
      : (en || ar || fallback || `#${c.contractorCompanyId}`);
  }

  private propertyLabel(p: Property): string {
    const ar = (p.propertyNameAr ?? '').trim();
    const en = (p.propertyNameEn ?? '').trim();
    const fallback = (p.propertyName ?? '').trim();
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || `#${p.id}`)
      : (en || ar || fallback || `#${p.id}`);
  }
}
