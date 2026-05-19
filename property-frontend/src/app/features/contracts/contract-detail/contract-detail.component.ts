import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import { RecordPaymentFormComponent } from '../record-payment-form/record-payment-form.component';
import { ReviewDialogComponent, ReviewDialogData } from '../../accountant/review-dialog/review-dialog.component';
import {
  TerminateContractDialogComponent,
  TerminateContractDialogData
} from '../terminate-contract-dialog/terminate-contract-dialog.component';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';
import { ContractFormComponent } from '../contract-form/contract-form.component';
import {
  CancelDraftContractDialogComponent,
  CancelDraftContractDialogData
} from '../cancel-draft-contract-dialog/cancel-draft-contract-dialog.component';
import { OwnerDraftAmendDialogComponent } from '../../owner/owner-draft-amend-dialog/owner-draft-amend-dialog.component';
import { OwnerDraftRejectDialogComponent } from '../../owner/owner-draft-reject-dialog/owner-draft-reject-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ContractService } from '../../../core/services/contract.service';
import { ContractAnnex, ContractAnnexService } from '../../../core/services/contract-annex.service';
import { ContractFee, ContractFeeService } from '../../../core/services/contract-fee.service';
import { PaymentService } from '../../../core/services/payment.service';
import { OwnerPortalService } from '../../../core/services/owner-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ComplaintService } from '../../../core/services/complaint.service';
import { Tenant, TenantService } from '../../../core/services/tenant.service';
import {
  LeaseContract,
  RentPaymentSchedule,
  TenantComplaint
} from '../../../core/models/contract.model';

export type ContractDetailSection = 'info' | 'schedule' | 'complaints' | 'annexes' | 'fees';

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, DecimalPipe, NgClass, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule, MatDialogModule, MatPaginatorModule,
    MatTooltipModule,
    TranslateModule, PageHeaderComponent, AuditTrailComponent,
    ContractFormComponent, CancelDraftContractDialogComponent,
    OwnerDraftAmendDialogComponent, OwnerDraftRejectDialogComponent
  ],
  templateUrl: './contract-detail.component.html',
  styleUrl: './contract-detail.component.scss'
})
export class ContractDetailComponent implements OnInit {
  loading = true;
  actionLoading = false;
  contractId!: number;

  contract: LeaseContract | null = null;
  tenant: Tenant | null = null;
  schedule: RentPaymentSchedule[] = [];
  complaints: TenantComplaint[] = [];
  annexes: ContractAnnex[] = [];
  annexTitle = '';
  annexDescription = '';
  annexNumber = '';
  annexEffectiveDate = '';
  annexDocumentUrl = '';
  savingAnnex = false;

  fees: ContractFee[] = [];
  feeType = '';
  feeDescription = '';
  feeAmount: number | null = null;
  feeDueDate = '';
  savingFee = false;

  section: ContractDetailSection = 'info';

  /** Same default page size as {@link PropertyListComponent}. */
  readonly schedulePageSize = 5;
  schedulePageIndex = 0;
  highlightedScheduleId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contractSvc: ContractService,
    private paymentSvc: PaymentService,
    private readonly ownerPortal: OwnerPortalService,
    private complaintSvc: ComplaintService,
    private tenantSvc: TenantService,
    private readonly annexSvc: ContractAnnexService,
    private readonly feeSvc: ContractFeeService,
    private location: Location,
    private dialog: MatDialog,
    private readonly snack: SnackService,
    readonly auth: AuthService,
    readonly permissions: PermissionService,
    readonly i18n: I18nService
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.contractId = Number(this.route.snapshot.paramMap.get('id'));
    this.applyScheduleDeepLink();
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      contract: this.contractSvc.getById(this.contractId).pipe(catchError(() => of(null))),
      schedule: this.contractSvc.getPaymentSchedule(this.contractId).pipe(catchError(() => of(null))),
      complaints: this.complaintSvc.getAll({ contractId: this.contractId }).pipe(catchError(() => of(null))),
      annexes: this.annexSvc.getByContract(this.contractId).pipe(catchError(() => of(null))),
      fees: this.feeSvc.getByContract(this.contractId).pipe(catchError(() => of(null)))
    }).subscribe(({ contract, schedule, complaints, annexes, fees }) => {
      this.contract = contract?.data ?? null;
      const schedPayload = schedule?.data;
      this.schedule = schedPayload?.content ?? schedPayload ?? [];
      this.complaints = complaints?.data?.content ?? complaints?.data ?? [];
      this.annexes = annexes?.data ?? [];
      this.fees = fees?.data ?? [];
      this.focusHighlightedSchedule();
      this.schedulePageIndex = Math.min(
        this.schedulePageIndex,
        Math.max(Math.ceil(this.schedule.length / this.schedulePageSize) - 1, 0)
      );
      this.loading = false;
      if (this.contract?.tenantId) {
        this.tenantSvc.getById(this.contract.tenantId)
          .pipe(catchError(() => of(null)))
          .subscribe(res => { this.tenant = res?.data ?? null; });
      }
    });
  }

  get schedulePageSlice(): RentPaymentSchedule[] {
    const start = this.schedulePageIndex * this.schedulePageSize;
    return this.schedule.slice(start, start + this.schedulePageSize);
  }

  get scheduleTotalPages(): number {
    return Math.max(1, Math.ceil(this.schedule.length / this.schedulePageSize));
  }

  get schedulePageStart(): number {
    if (!this.schedule.length) return 0;
    return this.schedulePageIndex * this.schedulePageSize + 1;
  }

  get schedulePageEnd(): number {
    return Math.min((this.schedulePageIndex + 1) * this.schedulePageSize, this.schedule.length);
  }

  onScheduleMatPage(event: PageEvent): void {
    this.schedulePageIndex = event.pageIndex;
  }

  goToSchedulePage(pageNumber: number): void {
    const nextPage = pageNumber - 1;
    if (nextPage < 0 || nextPage >= this.scheduleTotalPages || nextPage === this.schedulePageIndex) return;
    this.schedulePageIndex = nextPage;
  }

  previousSchedulePage(): void {
    this.goToSchedulePage(this.schedulePageIndex + 1);
  }

  nextSchedulePage(): void {
    this.goToSchedulePage(this.schedulePageIndex + 2);
  }

  schedulePageItems(): Array<number | 'ellipsis'> {
    const total = this.scheduleTotalPages;
    const current = this.schedulePageIndex + 1;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', total];
    }

    if (current >= total - 3) {
      return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
  }

  setSection(s: ContractDetailSection): void {
    this.section = s;
    if (s === 'annexes' && this.annexes.length === 0) {
      this.loadAnnexes();
    }
  }

  loadAnnexes(): void {
    this.annexSvc.getByContract(this.contractId).subscribe({
      next: (res) => { this.annexes = res.data ?? []; },
      error: () => { this.annexes = []; }
    });
  }

  canManageAnnexes(): boolean {
    return this.permissions.can('contracts', 'create');
  }

  submitAnnex(): void {
    if (!this.annexTitle.trim()) return;
    this.savingAnnex = true;
    this.annexSvc.create(this.contractId, {
      title: this.annexTitle.trim(),
      annexNumber: this.annexNumber.trim() || undefined,
      description: this.annexDescription.trim() || undefined,
      effectiveDate: this.annexEffectiveDate || undefined,
      documentUrl: this.annexDocumentUrl.trim() || undefined
    }).subscribe({
      next: () => {
        this.savingAnnex = false;
        this.annexTitle = '';
        this.annexNumber = '';
        this.annexDescription = '';
        this.annexEffectiveDate = '';
        this.annexDocumentUrl = '';
        this.loadAnnexes();
        this.snack.success(this.i18n.instant('CONTRACTS.ANNEX_SAVED'));
      },
      error: () => {
        this.savingAnnex = false;
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  deleteAnnex(id: number): void {
    this.annexSvc.delete(this.contractId, id).subscribe({
      next: () => { this.annexes = this.annexes.filter(a => a.id !== id); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  canManageFees(): boolean { return this.permissions.can('contracts', 'edit'); }

  submitFee(): void {
    if (!this.feeAmount || this.feeAmount <= 0 || this.savingFee) return;
    this.savingFee = true;
    this.feeSvc.create({
      contractId: this.contractId,
      feeType: this.feeType || undefined,
      description: this.feeDescription || undefined,
      amount: this.feeAmount,
      dueDate: this.feeDueDate || undefined
    }).subscribe({
      next: (res) => {
        if (res.data) this.fees = [...this.fees, res.data];
        this.feeType = '';
        this.feeDescription = '';
        this.feeAmount = null;
        this.feeDueDate = '';
        this.savingFee = false;
        this.snack.success(this.i18n.instant('CONTRACTS.FEE_SAVED'));
      },
      error: () => { this.savingFee = false; this.snack.error(this.i18n.instant('COMMON.ERROR')); }
    });
  }

  markFeePaid(fee: ContractFee): void {
    this.feeSvc.markPaid(fee.id).subscribe({
      next: (res) => {
        if (res.data) this.fees = this.fees.map(f => f.id === fee.id ? res.data! : f);
        this.snack.success(this.i18n.instant('CONTRACTS.FEE_MARKED_PAID'));
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  deleteFee(id: number): void {
    this.feeSvc.delete(id).subscribe({
      next: () => { this.fees = this.fees.filter(f => f.id !== id); },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  private applyScheduleDeepLink(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    const scheduleId = Number(this.route.snapshot.queryParamMap.get('scheduleId'));
    if (tab === 'schedule') {
      this.section = 'schedule';
    }
    this.highlightedScheduleId = Number.isFinite(scheduleId) && scheduleId > 0 ? scheduleId : null;
  }

  private focusHighlightedSchedule(): void {
    if (!this.highlightedScheduleId || !this.schedule.length) return;
    const idx = this.schedule.findIndex((row) => row.id === this.highlightedScheduleId);
    if (idx >= 0) {
      this.section = 'schedule';
      this.schedulePageIndex = Math.floor(idx / this.schedulePageSize);
    }
  }

  activate(): void {
    if (!this.contract) return;
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_CONTRACT_APPROVAL'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_APPROVE_AND_ACTIVATE_THIS_CONT')
    ).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.contractSvc.activate(this.contractId).subscribe({
        next: () => {
          this.actionLoading = false;
          this.snack.success(this.i18n.instant('CONTRACTS.ACTIVATED_SUCCESS'));
          this.loadAll();
        },
        error: (err: Error) => {
          this.actionLoading = false;
          this.snack.error(err?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  canStaffDraftActions(): boolean {
    const s = this.contract?.status;
    if (s !== 'DRAFT' && s !== 'PENDING_OWNER_APPROVAL') return false;
    return this.permissions.can('contracts', 'edit');
  }

  /** Owner uses owner-portal amend/reject APIs (full staff edit form is blocked server-side for OWNER). */
  canOwnerDraftActions(): boolean {
    const s = this.contract?.status;
    if (s !== 'DRAFT' && s !== 'PENDING_OWNER_APPROVAL') return false;
    return this.permissions.can('owner_portal', 'approve');
  }

  canShowEditDraft(): boolean {
    return this.canStaffDraftActions() || this.canOwnerDraftActions();
  }

  canShowRejectDraft(): boolean {
    return this.canStaffDraftActions() || this.canOwnerDraftActions();
  }

  /** Matches {@code LeaseContractController}: staff roles + owner (owner scoped by property on activate). */
  canActivateContract(): boolean {
    const s = this.contract?.status;
    if (s !== 'DRAFT' && s !== 'PENDING_OWNER_APPROVAL') return false;
    return this.permissions.can('contracts', 'approve') || this.permissions.can('owner_portal', 'approve');
  }

  openEditDraft(): void {
    if (!this.canShowEditDraft()) return;
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CONTINUE_EDITING_THIS_CONTRACT')
    ).subscribe((ok) => {
      if (!ok) return;
    if (this.auth.isOwner()) {
      if (!this.contract) return;
      this.dialog.open(OwnerDraftAmendDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        disableClose: true,
        data: {
          contractId: this.contractId,
          contractNumber: this.contract.contractNumber ?? '',
          currentUnitId: this.contract.unitId,
          currentRent: this.contract.monthlyRent ?? 0
        }
      }).afterClosed().subscribe((payload: { unitId?: number; monthlyRent?: number; reason: string } | null | undefined) => {
        if (!payload) return;
        this.actionLoading = true;
        this.ownerPortal.amendDraftContract(this.contractId, payload).subscribe({
          next: () => {
            this.actionLoading = false;
            this.snack.success(this.i18n.instant('OWNER_PORTAL.AMEND_OK'));
            this.loadAll();
          },
          error: (e: unknown) => {
            this.actionLoading = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
      return;
    }
    this.dialog.open(ContractFormComponent, {
      width: '980px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: { contractId: this.contractId }
    }).afterClosed().subscribe((saved) => {
      if (saved) this.loadAll();
    });
    });
  }

  openRejectDraft(): void {
    if (!this.canShowRejectDraft()) return;
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CONTINUE_CANCELLING_REJECTING_')
    ).subscribe((ok) => {
      if (!ok) return;
    if (this.auth.isOwner()) {
      if (!this.contract) return;
      this.dialog.open(OwnerDraftRejectDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        data: { contractId: this.contractId, contractNumber: this.contract.contractNumber ?? '' }
      }).afterClosed().subscribe((reason: string | null | undefined) => {
        if (!reason) return;
        this.actionLoading = true;
        this.ownerPortal.rejectDraftContract(this.contractId, reason).subscribe({
          next: () => {
            this.actionLoading = false;
            this.snack.success(this.i18n.instant('OWNER_PORTAL.REJECT_OK'));
            this.loadAll();
          },
          error: (e: unknown) => {
            this.actionLoading = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
      return;
    }
    const data: CancelDraftContractDialogData = { contractId: this.contractId };
    this.dialog.open(CancelDraftContractDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data
    }).afterClosed().subscribe((done) => {
      if (done) {
        this.snack.success(this.i18n.instant('CONTRACTS.DRAFT_CANCELLED_SUCCESS'));
        this.loadAll();
      }
    });
    });
  }

  goToRenew(): void {
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_RENEWAL_REQUEST'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_START_A_CONTRACT_RENEWAL_REQUE')
    ).subscribe((ok) => {
      if (!ok) return;
      this.router.navigate(['/admin/contracts', this.contractId, 'renew']);
    });
  }

  canTerminate(): boolean {
    return this.contract?.status === 'ACTIVE' || this.contract?.status === 'SUSPENDED';
  }

  canRequestRenewal(): boolean {
    return this.contract?.status === 'ACTIVE';
  }

  isRenewalPending(): boolean {
    return this.contract?.status === 'PENDING_RENEWAL_APPROVAL';
  }

  canCancelRenewalRequest(): boolean {
    if (!this.isRenewalPending()) return false;
    return this.permissions.can('contracts', 'edit');
  }

  isTerminationPending(): boolean {
    return this.contract?.status === 'PENDING_TERMINATION_APPROVAL';
  }

  /** Staff may withdraw their pending termination request before the owner decides. */
  canCancelTerminationRequest(): boolean {
    if (!this.isTerminationPending()) return false;
    return this.permissions.can('contracts', 'edit');
  }

  hasStructuredTerminationHandover(): boolean {
    return !!this.contract && this.contract.status === 'TERMINATED'
      && this.contract.terminationDepositReturn != null;
  }

  openTerminateDialog(): void {
    if (!this.contract || !this.canTerminate()) return;
    const contract = this.contract;
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CONTINUE_WITH_CONTRACT_TERMINA')
    ).subscribe((ok) => {
      if (!ok) return;
      const data: TerminateContractDialogData = {
        contractId: this.contractId,
        currency: contract.currency ?? 'SAR'
      };
      this.dialog.open(TerminateContractDialogComponent, {
        width: '720px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        panelClass: 'app-dialog-panel',
        disableClose: true,
        data
      }).afterClosed().subscribe(done => {
        if (done) this.loadAll();
      });
    });
  }

  cancelTerminationRequest(): void {
    if (!this.contract || !this.canCancelTerminationRequest()) return;
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CANCEL_THE_TERMINATION_REQUEST')
    ).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.contractSvc.cancelTerminationRequest(this.contractId).subscribe({
        next: () => {
          this.actionLoading = false;
          this.snack.success(this.i18n.instant('CONTRACTS.TERMINATION_REQUEST_CANCELLED_OK'));
          this.loadAll();
        },
        error: (e: { error?: { message?: string } }) => {
          this.actionLoading = false;
          this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  cancelRenewalRequest(): void {
    if (!this.contract || !this.canCancelRenewalRequest()) return;
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CANCEL_THE_RENEWAL_REQUEST')
    ).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.contractSvc.cancelRenewalRequest(this.contractId).subscribe({
        next: () => {
          this.actionLoading = false;
          this.snack.success(this.i18n.instant('CONTRACT.RENEWAL.PENDING_BANNER.CANCEL_OK'));
          this.loadAll();
        },
        error: (e: { error?: { message?: string } }) => {
          this.actionLoading = false;
          this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  private openActionConfirm(title: string, message: string) {
    return this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {
        title,
        message,
        confirmLabel: this.i18n.instant('INLINE_TEXT.OK'),
        cancelLabel: this.i18n.instant('INLINE_TEXT.CANCEL'),
        icon: 'warning'
      } as ConfirmDialogData
    }).afterClosed();
  }

  canDecideTermination(): boolean {
    if (!this.isTerminationPending()) return false;
    return this.permissions.can('owner_portal', 'approve') || this.permissions.can('contracts', 'approve');
  }

  decideTermination(decision: 'APPROVED' | 'REJECTED'): void {
    const isAr = this.i18n.currentLang === 'ar';
    const title = decision === 'APPROVED'
      ? (this.i18n.instant('INLINE_TEXT.CONFIRM_TERMINATION_APPROVAL'))
      : (this.i18n.instant('INLINE_TEXT.CONFIRM_TERMINATION_REJECTION'));
    const message = decision === 'APPROVED'
      ? (this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_APPROVE_THE_TERMINATION_THE_UN'))
      : (this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_REJECT_THE_TERMINATION_REQUEST'));
    this.openActionConfirm(title, message).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.ownerPortal.decideTermination(this.contractId, { decision }).subscribe({
        next: () => {
          this.actionLoading = false;
          const msg = decision === 'APPROVED'
            ? (this.i18n.instant('INLINE_TEXT.TERMINATION_APPROVED_UNIT_IS_NOW_VACANT'))
            : (this.i18n.instant('INLINE_TEXT.TERMINATION_REQUEST_REJECTED'));
          this.snack.success(msg);
          this.loadAll();
        },
        error: (e: { error?: { message?: string } }) => {
          this.actionLoading = false;
          this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  private allLogRows(): { timestamp: string; actor: string; actionKey: string; action: string; detail: string }[] {
    const raw = this.contract?.staffChangeLog;
    if (!raw) return [];
    return raw.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(' | ');
        const key = parts[2] ?? '';
        return {
          timestamp: parts[0] ?? '',
          actor: parts[1] ?? '',
          actionKey: key,
          action: this.translateAction(key),
          detail: parts[3] ?? ''
        };
      })
      .reverse();
  }

  parsedStaffLog(): { timestamp: string; actor: string; action: string; detail: string }[] {
    return this.allLogRows();
  }

  registrationLog(): { timestamp: string; actor: string; action: string; detail: string }[] {
    const renewal = new Set(['RENEWAL_REQUESTED','RENEWAL_APPROVED','RENEWAL_REJECTED','RENEWAL_REQUEST_CANCELLED']);
    const termination = new Set(['TERMINATION_REQUESTED','TERMINATION_APPROVED','TERMINATION_REJECTED','TERMINATION_REQUEST_CANCELLED','CANCELLED']);
    return this.allLogRows().filter(r => !renewal.has(r.actionKey) && !termination.has(r.actionKey));
  }

  renewalLog(): { timestamp: string; actor: string; action: string; detail: string }[] {
    const renewal = new Set(['RENEWAL_REQUESTED','RENEWAL_APPROVED','RENEWAL_REJECTED','RENEWAL_REQUEST_CANCELLED']);
    return this.allLogRows().filter(r => renewal.has(r.actionKey));
  }

  terminationLog(): { timestamp: string; actor: string; action: string; detail: string }[] {
    const termination = new Set(['TERMINATION_REQUESTED','TERMINATION_APPROVED','TERMINATION_REJECTED','TERMINATION_REQUEST_CANCELLED','CANCELLED']);
    return this.allLogRows().filter(r => termination.has(r.actionKey));
  }

  translateTerminationReason(reason: string | null | undefined): string {
    if (!reason) return '-';
    const ar = this.i18n.currentLang === 'ar';
    const codes: Record<string, { ar: string; en: string }> = {
      VIOLATION:          { ar: 'مخالفة شروط العقد',   en: 'Contract violation' },
      NON_PAYMENT:        { ar: 'عدم سداد الإيجار',    en: 'Non-payment of rent' },
      LEASE_EXPIRY:       { ar: 'انتهاء مدة العقد',    en: 'Lease expiry' },
      MUTUAL_AGREEMENT:   { ar: 'اتفاق متبادل',        en: 'Mutual agreement' },
      PROPERTY_SALE:      { ar: 'بيع العقار',           en: 'Property sale' },
      TENANT_REQUEST:     { ar: 'طلب المستأجر',         en: 'Tenant request' },
      OWNER_REQUEST:      { ar: 'طلب المالك',           en: 'Owner request' }
    };
    const normalized = reason.trim().toUpperCase().replace(/\s+/g, '_');
    const match = codes[normalized];
    if (match) return match[ar ? 'ar' : 'en'];
    return reason;
  }

  private translateAction(action: string): string {
    const isAr = this.i18n.currentLang === 'ar';
    const mapAr: Record<string, string> = {
      DRAFT_CREATED: 'إنشاء مسودة العقد',
      OWNER_DRAFT_REJECTED: 'رفض المالك للمسودة',
      OWNER_PENDING_APPROVAL_REJECTED: 'رفض المالك لطلب الاعتماد',
      ACTIVATED: 'تفعيل العقد',
      DRAFT_UPDATED: 'تعديل المسودة',
      CANCELLED: 'إلغاء العقد',
      TERMINATION_REQUESTED: 'طلب إنهاء العقد',
      TERMINATION_APPROVED: 'موافقة على الإنهاء',
      TERMINATION_REJECTED: 'رفض طلب الإنهاء',
      TERMINATION_REQUEST_CANCELLED: 'سحب طلب الإنهاء',
      RENEWAL_REQUESTED: 'طلب تجديد العقد',
      RENEWAL_APPROVED: 'موافقة على التجديد',
      RENEWAL_REJECTED: 'رفض طلب التجديد',
      RENEWAL_REQUEST_CANCELLED: 'سحب طلب التجديد',
    };
    const mapEn: Record<string, string> = {
      DRAFT_CREATED: 'Draft contract created',
      OWNER_DRAFT_REJECTED: 'Owner rejected draft',
      OWNER_PENDING_APPROVAL_REJECTED: 'Owner rejected approval request',
      ACTIVATED: 'Contract activated',
      DRAFT_UPDATED: 'Draft updated',
      CANCELLED: 'Contract cancelled',
      TERMINATION_REQUESTED: 'Termination requested',
      TERMINATION_APPROVED: 'Termination approved',
      TERMINATION_REJECTED: 'Termination rejected',
      TERMINATION_REQUEST_CANCELLED: 'Termination request withdrawn',
      RENEWAL_REQUESTED: 'Renewal requested',
      RENEWAL_APPROVED: 'Renewal approved',
      RENEWAL_REJECTED: 'Renewal rejected',
      RENEWAL_REQUEST_CANCELLED: 'Renewal request withdrawn',
    };
    return (isAr ? mapAr : mapEn)[action] ?? action;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-success', DRAFT: 'chip-default', EXPIRED: 'chip-danger',
      TERMINATED: 'chip-danger', RENEWED: 'chip-info', SUSPENDED: 'chip-warn',
      CANCELLED: 'chip-danger', PENDING_OWNER_APPROVAL: 'chip-warn',
      PENDING_TERMINATION_APPROVAL: 'chip-warn',
      PENDING_RENEWAL_APPROVAL: 'chip-warn',
      PENDING: 'chip-default', PAID: 'chip-success', OVERDUE: 'chip-danger',
      PARTIAL: 'chip-warn', WAIVED: 'chip-info',
      OPEN: 'chip-warn', RESOLVED: 'chip-success', NOTIFIED: 'chip-info',
      IN_REVIEW: 'chip-info', CLOSED: 'chip-default'
    };
    return map[status] ?? 'chip-default';
  }

  isHighlightedSchedule(row: RentPaymentSchedule): boolean {
    return this.highlightedScheduleId === row.id || row.status === 'PENDING_CONFIRMATION';
  }

  canReviewProof(row: RentPaymentSchedule): boolean {
    return row.status === 'PENDING_CONFIRMATION'
      && this.permissions.can('contracts', 'approve');
  }

  proofUrls(row: RentPaymentSchedule): string[] {
    const urls = row.proofUrls?.length ? row.proofUrls : [row.proofUrl || row.receiptUrl || ''];
    return urls.filter((url): url is string => !!url);
  }

  hasProof(row: RentPaymentSchedule): boolean {
    return !!(this.proofUrls(row).length || row.proofPaymentDate || row.proofSubmittedAt || row.proofPaymentMethod || row.proofReferenceNumber);
  }

  viewProof(url: string): void {
    window.open(url, '_blank');
  }

  openProofDetails(row: RentPaymentSchedule): void {
    const isAr = this.i18n.currentLang === 'ar';
    const lines = [
      `${this.i18n.instant('INLINE_TEXT.PROPERTY')}: ${this.contract?.propertyName ?? '-'}`,
      `${this.i18n.instant('INLINE_TEXT.UNIT')}: ${this.contract?.unitNumber ?? '-'}`,
      `${this.i18n.instant('INLINE_TEXT.PAYMENT_DATE_2')}: ${this.formatDisplayDate(row.proofPaymentDate)}`,
      `${this.i18n.instant('INLINE_TEXT.SUBMITTED_AT')}: ${this.formatDisplayDateTime(row.proofSubmittedAt)}`,
      `${this.i18n.instant('INLINE_TEXT.REVIEWED_AT')}: ${this.formatDisplayDateTime(row.reviewedAt)}`,
      `${this.i18n.instant('INLINE_TEXT.TRANSFER_TYPE')}: ${row.proofPaymentMethod ?? '-'}`,
      `${this.i18n.instant('INLINE_TEXT.TRANSFER_REFERENCE')}: ${row.proofReferenceNumber ?? '-'}`
    ];
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {
        title: this.i18n.instant('INLINE_TEXT.PAYMENT_PROOF_DETAILS'),
        message: lines.join('\n'),
        confirmLabel: this.i18n.instant('INLINE_TEXT.CLOSE'),
        alertOnly: true,
        icon: 'info'
      } as ConfirmDialogData
    });
  }

  reviewProof(row: RentPaymentSchedule, decision: 'APPROVED' | 'REJECTED'): void {
    if (!this.canReviewProof(row)) return;
    const data: ReviewDialogData = {
      title: decision === 'APPROVED'
        ? (this.i18n.instant('INLINE_TEXT.APPROVE_PAYMENT_PROOF'))
        : (this.i18n.instant('INLINE_TEXT.REJECT_PAYMENT_PROOF')),
      currentStatus: row.status
    };
    const ref = this.dialog.open(ReviewDialogComponent, { width: '420px', data, disableClose: true });
    ref.afterClosed().subscribe((result: { status: string; notes: string } | undefined) => {
      if (!result) return;
      const status = result.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      this.paymentSvc.reviewProof(row.id, status, result.notes).subscribe({
        next: () => {
          this.snack.success(this.i18n.instant('COMMON.SAVED'));
          this.loadAll();
        },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }

  private formatDisplayDate(value?: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB');
  }

  private formatDisplayDateTime(value?: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }

  canOpenMarkPaid(row: RentPaymentSchedule): boolean {
    return this.contract?.status === 'ACTIVE'
      && (row.status === 'PENDING' || row.status === 'OVERDUE' || row.status === 'PARTIAL');
  }

  isPaidLike(row: RentPaymentSchedule): boolean {
    return row.status === 'PAID' || row.status === 'PARTIAL';
  }

  openMarkPaidDialog(row: RentPaymentSchedule): void {
    if (!this.contract || !this.canOpenMarkPaid(row)) return;
    this.dialog.open(RecordPaymentFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      disableClose: true,
      data: {
        contractId: this.contractId,
        tenantId: this.contract.tenantId,
        scheduleId: row.id,
        amountDue: row.amount,
        requireReceipt: true,
        hideScheduleFields: true
      }
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadAll();
    });
  }

  // ── Handover actions ──────────────────────────────────────────────────────

  returnDeposit(): void {
    const ar = this.i18n.currentLang === 'ar';
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.RETURN_SECURITY_DEPOSIT'),
      ar ? `هل أنت متأكد من إعادة مبلغ التأمين (${this.contract?.securityDeposit} ${this.contract?.currency}) للمستأجر؟ سيتم تسجيل مصروف في حسابات العقار.`
         : `Are you sure you want to return the security deposit (${this.contract?.securityDeposit} ${this.contract?.currency}) to the tenant? An expense will be recorded.`
    ).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.contractSvc.returnDeposit(this.contractId).subscribe({
        next: (res) => {
          this.actionLoading = false;
          this.contract = res.data ?? this.contract;
          this.snack.success(this.i18n.instant('INLINE_TEXT.DEPOSIT_RETURNED_AND_EXPENSE_RECORDED'));
        },
        error: (e: { error?: { message?: string } }) => {
          this.actionLoading = false;
          this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  openReportDamagesDialog(): void {
    const ar = this.i18n.currentLang === 'ar';
    const amountStr = window.prompt(this.i18n.instant('INLINE_TEXT.ENTER_DAMAGE_AMOUNT'), '0');
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) return;
    const notesStr = window.prompt(this.i18n.instant('INLINE_TEXT.DAMAGE_DESCRIPTION_OPTIONAL'), '') ?? '';
    this.actionLoading = true;
    this.contractSvc.reportDamages(this.contractId, Number(amountStr), notesStr).subscribe({
      next: (res) => {
        this.actionLoading = false;
        this.contract = res.data ?? this.contract;
        this.snack.success(this.i18n.instant('INLINE_TEXT.DAMAGES_REPORTED'));
      },
      error: (e: { error?: { message?: string } }) => {
        this.actionLoading = false;
        this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  confirmDamagePayment(): void {
    const ar = this.i18n.currentLang === 'ar';
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_DAMAGE_PAYMENT'),
      this.i18n.instant('INLINE_TEXT.CONFIRM_THAT_THE_DAMAGE_PAYMENT_HAS_BEEN_RECEIVED_A_REV')
    ).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.contractSvc.confirmDamagePayment(this.contractId, this.contract?.terminationDamagesReceiptUrl ?? undefined).subscribe({
        next: (res) => {
          this.actionLoading = false;
          this.contract = res.data ?? this.contract;
          this.snack.success(this.i18n.instant('INLINE_TEXT.DAMAGE_PAYMENT_CONFIRMED_AND_REVENUE_RECORDED'));
        },
        error: (e: { error?: { message?: string } }) => {
          this.actionLoading = false;
          this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  clearUnit(): void {
    const ar = this.i18n.currentLang === 'ar';
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CLEAR_RELEASE_UNIT'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CLEAR_THE_UNIT_IT_WILL_APPEAR_')
    ).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.contractSvc.clearUnit(this.contractId).subscribe({
        next: (res) => {
          this.actionLoading = false;
          this.contract = res.data ?? this.contract;
          this.snack.success(this.i18n.instant('INLINE_TEXT.UNIT_CLEARED_AND_NOW_AVAILABLE'));
        },
        error: (e: { error?: { message?: string } }) => {
          this.actionLoading = false;
          this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }
}

