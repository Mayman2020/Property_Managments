import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SnackService } from '../../../core/services/snack.service';
import { LeaseContract, RentPaymentSchedule } from '../../../core/models/contract.model';
import { PaymentProofDialogComponent } from '../payment-proof-dialog/payment-proof-dialog.component';

@Component({
  selector: 'app-tenant-contract-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule,
    PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './tenant-contract-detail.component.html',
  styleUrl: './tenant-contract-detail.component.scss'
})
export class TenantContractDetailComponent implements OnInit {
  contractId!: number;
  loading = true;
  error = false;
  contract: LeaseContract | null = null;
  schedule: RentPaymentSchedule[] = [];
  totalSchedule = 0;
  pageIndex = 0;
  readonly pageSize = 5;
  submittingScheduleId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly portalSvc: TenantPortalService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.error = true;
      this.loading = false;
      return;
    }
    this.contractId = id;
    this.loadContract();
  }

  loadContract(): void {
    this.loading = true;
    this.portalSvc.getTenantContract(this.contractId).subscribe({
      next: (contract) => {
        this.contract = contract.data ?? null;
        this.loading = false;
        if (!this.contract) this.error = true;
        this.loadSchedule();
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadSchedule(): void {
    this.portalSvc.getTenantContractSchedule(this.contractId, { page: this.pageIndex, size: this.pageSize }).subscribe({
      next: (res) => {
        const page = res.data;
        this.schedule = page?.content ?? [];
        this.totalSchedule = page?.totalElements ?? 0;
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  onPageChange(index: number): void {
    this.pageIndex = index;
    this.loadSchedule();
  }

  statusLabel(s: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${s}`);
  }

  scheduleStatusLabel(s: string): string {
    return this.i18n.instant(`CONTRACTS.SCHED_${s}`);
  }

  isPaidLike(row: RentPaymentSchedule): boolean {
    return row.status === 'PAID' || row.status === 'PARTIAL';
  }

  canUploadProof(row: RentPaymentSchedule): boolean {
    return row.status === 'PENDING' || row.status === 'OVERDUE' || row.status === 'PAYMENT_REJECTED';
  }

  openProofDialog(row: RentPaymentSchedule): void {
    if (!this.canUploadProof(row)) return;
    this.dialog.open(PaymentProofDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      maxHeight: '92vh',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { row }
    }).afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.submitProof(row, payload);
    });
  }

  private submitProof(row: RentPaymentSchedule, payload: any): void {
    this.submittingScheduleId = row.id;
    this.portalSvc.uploadPaymentProof(this.contractId, row.id, payload).subscribe({
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

  scheduleRowClass(row: RentPaymentSchedule): string {
    if (row.status === 'PAID') return 'st-paid';
    if (row.status === 'PARTIAL') return 'st-partial';
    if (row.status === 'PENDING_CONFIRMATION') return 'st-confirming';
    if (row.status === 'PAYMENT_REJECTED') return 'st-rejected';
    if (row.status === 'OVERDUE') return 'st-overdue';
    if (row.status === 'WAIVED') return 'st-waived';
    return 'st-pending';
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
}
