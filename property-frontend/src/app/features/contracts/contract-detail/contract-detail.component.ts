import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
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
import { PaymentService } from '../../../core/services/payment.service';
import { OwnerPortalService } from '../../../core/services/owner-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ComplaintService } from '../../../core/services/complaint.service';
import { Tenant, TenantService } from '../../../core/services/tenant.service';
import {
  LeaseContract,
  RentPaymentSchedule,
  TenantComplaint
} from '../../../core/models/contract.model';

export type ContractDetailSection = 'info' | 'schedule' | 'complaints';

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [
    NgIf, NgFor, DatePipe, DecimalPipe, NgClass,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule, MatDialogModule, MatPaginatorModule,
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
    private location: Location,
    private dialog: MatDialog,
    private readonly snack: SnackService,
    readonly auth: AuthService,
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
      complaints: this.complaintSvc.getAll({ contractId: this.contractId }).pipe(catchError(() => of(null)))
    }).subscribe(({ contract, schedule, complaints }) => {
      this.contract = contract?.data ?? null;
      const schedPayload = schedule?.data;
      this.schedule = schedPayload?.content ?? schedPayload ?? [];
      this.complaints = complaints?.data?.content ?? complaints?.data ?? [];
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
      this.i18n.currentLang === 'ar' ? 'تأكيد قبول العقد' : 'Confirm Contract Approval',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من قبول العقد وتفعيله؟'
        : 'Are you sure you want to approve and activate this contract?'
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
    return this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant();
  }

  /** Owner uses owner-portal amend/reject APIs (full staff edit form is blocked server-side for OWNER). */
  canOwnerDraftActions(): boolean {
    const s = this.contract?.status;
    if (s !== 'DRAFT' && s !== 'PENDING_OWNER_APPROVAL') return false;
    return this.auth.isOwner();
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
    return this.auth.isSuperAdmin()
      || this.auth.isGeneralManager()
      || this.auth.isAccountant()
      || this.auth.isOwner();
  }

  openEditDraft(): void {
    if (!this.canShowEditDraft()) return;
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من متابعة تعديل العقد؟'
        : 'Are you sure you want to continue editing this contract?'
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
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من متابعة إلغاء/رفض العقد؟'
        : 'Are you sure you want to continue cancelling/rejecting this contract?'
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
      this.i18n.currentLang === 'ar' ? 'تأكيد طلب التجديد' : 'Confirm Renewal Request',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من بدء طلب تجديد العقد؟'
        : 'Are you sure you want to start a contract renewal request?'
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
    return this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant();
  }

  isTerminationPending(): boolean {
    return this.contract?.status === 'PENDING_TERMINATION_APPROVAL';
  }

  /** Staff (any role with terminate permission) may withdraw their pending request before owner decides. */
  canCancelTerminationRequest(): boolean {
    if (!this.isTerminationPending()) return false;
    return this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant();
  }

  hasStructuredTerminationHandover(): boolean {
    return !!this.contract && this.contract.status === 'TERMINATED'
      && this.contract.terminationDepositReturn != null;
  }

  openTerminateDialog(): void {
    if (!this.contract || !this.canTerminate()) return;
    const contract = this.contract;
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من متابعة إنهاء العقد؟'
        : 'Are you sure you want to continue with contract termination?'
    ).subscribe((ok) => {
      if (!ok) return;
      const data: TerminateContractDialogData = {
        contractId: this.contractId,
        currency: contract.currency ?? 'OMR'
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
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من إلغاء طلب إنهاء العقد؟'
        : 'Are you sure you want to cancel the termination request?'
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
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من إلغاء طلب تجديد العقد؟'
        : 'Are you sure you want to cancel the renewal request?'
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
        confirmLabel: this.i18n.currentLang === 'ar' ? 'موافق' : 'OK',
        cancelLabel: this.i18n.currentLang === 'ar' ? 'إلغاء' : 'Cancel',
        icon: 'warning'
      } as ConfirmDialogData
    }).afterClosed();
  }

  canDecideTermination(): boolean {
    if (!this.isTerminationPending()) return false;
    return this.auth.isOwner() || this.auth.isSuperAdmin() || this.auth.isGeneralManager();
  }

  decideTermination(decision: 'APPROVED' | 'REJECTED'): void {
    const isAr = this.i18n.currentLang === 'ar';
    const title = decision === 'APPROVED'
      ? (isAr ? 'تأكيد الموافقة على الإنهاء' : 'Confirm Termination Approval')
      : (isAr ? 'تأكيد رفض الإنهاء' : 'Confirm Termination Rejection');
    const message = decision === 'APPROVED'
      ? (isAr ? 'هل أنت متأكد من الموافقة على إنهاء العقد؟ ستصبح الوحدة شاغرة.' : 'Are you sure you want to approve the termination? The unit will become vacant.')
      : (isAr ? 'هل أنت متأكد من رفض طلب الإنهاء؟ سيظل العقد نشطاً.' : 'Are you sure you want to reject the termination request? The contract will remain active.');
    this.openActionConfirm(title, message).subscribe((ok) => {
      if (!ok) return;
      this.actionLoading = true;
      this.ownerPortal.decideTermination(this.contractId, { decision }).subscribe({
        next: () => {
          this.actionLoading = false;
          const msg = decision === 'APPROVED'
            ? (isAr ? 'تمت الموافقة على الإنهاء. الوحدة أصبحت شاغرة.' : 'Termination approved. Unit is now vacant.')
            : (isAr ? 'تم رفض طلب الإنهاء.' : 'Termination request rejected.');
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

  parsedStaffLog(): { timestamp: string; actor: string; action: string; detail: string }[] {
    const raw = this.contract?.staffChangeLog;
    if (!raw) return [];
    return raw.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(' | ');
        return {
          timestamp: parts[0] ?? '',
          actor: parts[1] ?? '',
          action: this.translateAction(parts[2] ?? ''),
          detail: parts[3] ?? ''
        };
      })
      .reverse();
  }

  private translateAction(action: string): string {
    const isAr = this.i18n.currentLang === 'ar';
    if (!isAr) return action;
    const map: Record<string, string> = {
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
    return map[action] ?? action;
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
      && (this.auth.isAccountant() || this.auth.isSuperAdmin() || this.auth.isGeneralManager());
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
      `${isAr ? 'العقار' : 'Property'}: ${this.contract?.propertyName ?? '-'}`,
      `${isAr ? 'الوحدة' : 'Unit'}: ${this.contract?.unitNumber ?? '-'}`,
      `${isAr ? 'تاريخ الدفع' : 'Payment date'}: ${this.formatDisplayDate(row.proofPaymentDate)}`,
      `${isAr ? 'تاريخ الإرسال' : 'Submitted at'}: ${this.formatDisplayDateTime(row.proofSubmittedAt)}`,
      `${isAr ? 'تاريخ القبول/المراجعة' : 'Reviewed at'}: ${this.formatDisplayDateTime(row.reviewedAt)}`,
      `${isAr ? 'نوع التحويل' : 'Transfer type'}: ${row.proofPaymentMethod ?? '-'}`,
      `${isAr ? 'مرجع التحويل' : 'Transfer reference'}: ${row.proofReferenceNumber ?? '-'}`
    ];
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {
        title: isAr ? 'تفاصيل إثبات الدفع' : 'Payment proof details',
        message: lines.join('\n'),
        confirmLabel: isAr ? 'إغلاق' : 'Close',
        alertOnly: true,
        icon: 'info'
      } as ConfirmDialogData
    });
  }

  reviewProof(row: RentPaymentSchedule, decision: 'APPROVED' | 'REJECTED'): void {
    if (!this.canReviewProof(row)) return;
    const data: ReviewDialogData = {
      title: decision === 'APPROVED'
        ? (this.i18n.currentLang === 'ar' ? 'تأكيد قبول إثبات الدفع' : 'Approve payment proof')
        : (this.i18n.currentLang === 'ar' ? 'رفض إثبات الدفع' : 'Reject payment proof'),
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
}
