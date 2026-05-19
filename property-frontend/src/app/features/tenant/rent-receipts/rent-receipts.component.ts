import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { SearchDropdownComponent, SearchDropdownItem } from '../../../shared/components/search-dropdown/search-dropdown.component';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract, RentPaymentSchedule } from '../../../core/models/contract.model';
import { PaymentProofDialogComponent } from '../payment-proof-dialog/payment-proof-dialog.component';

@Component({
  selector: 'app-rent-receipts',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDialogModule, PageHeaderComponent, TablePagerComponent,
    SearchDropdownComponent
  ],
  templateUrl: './rent-receipts.component.html',
  styleUrl: './rent-receipts.component.scss'
})
export class RentReceiptsComponent implements OnInit, OnDestroy {
  contracts: LeaseContract[] = [];
  selectedContractId: number | null = null;
  selectedUnitFilterId: number | null = null;
  schedule: RentPaymentSchedule[] = [];
  totalSchedule = 0;
  pageIndex = 0;
  readonly pageSize = 5;
  loading = true;
  loadingSchedule = false;
  submittingScheduleId: number | null = null;
  contractSearchTerm = '';

  private qpSub?: Subscription;

  constructor(
    private readonly portalSvc: TenantPortalService,
    private readonly snack: SnackService,
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.subscribe((pm) => {
      const raw = pm.get('contractId');
      const n = raw != null && raw !== '' ? Number(raw) : null;
      this.selectedContractId = n != null && Number.isFinite(n) ? n : this.selectedContractId;
    });
    this.loadContracts();
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

  loadContracts(): void {
    this.loading = true;
    this.portalSvc.getMyContracts().subscribe({
      next: (res) => {
        this.contracts = res.data ?? [];
        const selectedExists = this.selectableContracts.some((c) => c.id === this.selectedContractId);
        if (this.selectedContractId != null && !selectedExists) {
          this.selectedContractId = null;
        }
        this.loading = false;
        this.loadSchedule();
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  loadSchedule(): void {
    if (!this.selectedContractId) {
      this.schedule = [];
      this.totalSchedule = 0;
      return;
    }
    this.loadingSchedule = true;
    this.portalSvc.getTenantContractSchedule(this.selectedContractId, { page: this.pageIndex, size: this.pageSize }).subscribe({
      next: (res) => {
        const page = res.data;
        this.schedule = page?.content ?? [];
        this.totalSchedule = page?.totalElements ?? 0;
        this.loadingSchedule = false;
      },
      error: () => {
        this.loadingSchedule = false;
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  selectContract(contract: LeaseContract): void {
    if (this.selectedContractId === contract.id) return;
    this.selectedContractId = contract.id;
    this.pageIndex = 0;
    this.loadSchedule();
  }

  selectUnitFilter(unitId: number | null): void {
    this.selectedUnitFilterId = unitId;
    const candidates = this.filteredContracts;
    if (unitId && !candidates.some((c) => c.id === this.selectedContractId)) {
      this.selectedContractId = candidates[0]?.id ?? null;
      this.pageIndex = 0;
      this.loadSchedule();
    }
  }

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.loadSchedule();
  }

  get selectedContract(): LeaseContract | null {
    return this.selectableContracts.find((c) => c.id === this.selectedContractId) ?? null;
  }

  get selectableContracts(): LeaseContract[] {
    return this.contracts.filter((c) => c.status === 'ACTIVE');
  }

  get unitOptions(): Array<{ unitId: number; unitNumber: string; propertyName: string }> {
    const seen = new Map<number, { unitId: number; unitNumber: string; propertyName: string }>();
    for (const contract of this.selectableContracts) {
      if (contract.unitId && !seen.has(contract.unitId)) {
        seen.set(contract.unitId, {
          unitId: contract.unitId,
          unitNumber: contract.unitNumber || '',
          propertyName: contract.propertyName || ''
        });
      }
    }
    return Array.from(seen.values());
  }

  get filteredContracts(): LeaseContract[] {
    const q = this.contractSearchTerm.trim().toLowerCase();
    return this.selectableContracts.filter((contract) => {
      if (this.selectedUnitFilterId && contract.unitId !== this.selectedUnitFilterId) return false;
      if (!q) return true;
      return [
        contract.contractNumber,
        contract.propertyName,
        contract.unitNumber,
        contract.status
      ].join(' ').toLowerCase().includes(q);
    });
  }

  onContractSearch(value: string): void {
    this.contractSearchTerm = value;
  }

  get contractDropdownItems(): SearchDropdownItem[] {
    return this.selectableContracts.map(c => ({
      label: c.contractNumber,
      subLabel: [c.propertyName, c.unitNumber ? (this.i18n.instant('INLINE_TEXT.UNIT_3')) + c.unitNumber : null]
        .filter(Boolean).join(' · '),
      badge: this.statusLabel(c.status),
      badgeClass: 'st-' + c.status,
      data: c
    }));
  }

  onContractDropdownSelect(contract: LeaseContract | null): void {
    if (contract) {
      this.selectContract(contract);
    } else {
      this.selectedContractId = null;
      this.selectedUnitFilterId = null;
      this.schedule = [];
      this.totalSchedule = 0;
    }
  }

  get nextDue(): RentPaymentSchedule | null {
    return [...this.schedule]
      .filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;
  }

  statusLabel(status: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${status}`);
  }

  scheduleStatusLabel(status: string): string {
    return this.i18n.instant(`CONTRACTS.SCHED_${status}`);
  }

  canUploadProof(row: RentPaymentSchedule): boolean {
    return row.status === 'PENDING' || row.status === 'OVERDUE' || row.status === 'PAYMENT_REJECTED';
  }

  isPaidLike(row: RentPaymentSchedule): boolean {
    return row.status === 'PAID' || row.status === 'PARTIAL';
  }

  openProofDialog(row: RentPaymentSchedule): void {
    if (!this.selectedContractId || !this.canUploadProof(row)) return;
    this.dialog.open(PaymentProofDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      maxHeight: '92vh',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { row }
    }).afterClosed().subscribe((payload) => {
      if (!payload || !this.selectedContractId) return;
      this.submitProof(row, payload);
    });
  }

  private submitProof(row: RentPaymentSchedule, payload: unknown): void {
    if (!this.selectedContractId) return;
    this.submittingScheduleId = row.id;
    this.portalSvc.uploadPaymentProof(this.selectedContractId, row.id, payload as any).subscribe({
      next: () => {
        this.snack.success(this.i18n.instant('TENANT_PORTAL.PAYMENT_PROOF_SUBMITTED'));
        this.submittingScheduleId = null;
        this.loadSchedule();
      },
      error: (e) => {
        this.submittingScheduleId = null;
        this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-success',
      DRAFT: 'chip-default',
      EXPIRED: 'chip-danger',
      TERMINATED: 'chip-danger',
      RENEWED: 'chip-info',
      SUSPENDED: 'chip-warn',
      CANCELLED: 'chip-danger',
      PENDING_OWNER_APPROVAL: 'chip-warn',
      PENDING_TERMINATION_APPROVAL: 'chip-warn',
      PENDING_RENEWAL_APPROVAL: 'chip-warn',
      PENDING: 'chip-default',
      PENDING_CONFIRMATION: 'chip-info',
      PAYMENT_REJECTED: 'chip-danger',
      PAID: 'chip-success',
      OVERDUE: 'chip-danger',
      PARTIAL: 'chip-warn',
      WAIVED: 'chip-info'
    };
    return map[status] ?? 'chip-default';
  }

  rowClass(row: RentPaymentSchedule): string {
    if (row.status === 'PAID') return 'st-paid';
    if (row.status === 'PARTIAL') return 'st-partial';
    if (row.status === 'PENDING_CONFIRMATION') return 'st-confirming';
    if (row.status === 'PAYMENT_REJECTED') return 'st-rejected';
    if (row.status === 'OVERDUE') return 'st-overdue';
    if (row.status === 'WAIVED') return 'st-waived';
    return 'st-pending';
  }
}
