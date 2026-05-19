import { DatePipe, DecimalPipe, Location, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';

import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { MaintenanceContractInvoiceResponse, MaintenanceContractInvoiceService } from '../../../core/services/maintenance-contract-invoice.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { SnackService } from '../../../core/services/snack.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuditTrailComponent } from '../../../shared/components/audit-trail/audit-trail.component';
import { UploadZoneComponent } from '../../../shared/components/upload-zone/upload-zone.component';
import {
  MaintenanceInvoicePaymentDialogComponent,
  MaintenanceInvoicePaymentDialogData,
  MaintenanceInvoicePaymentDialogResult
} from '../../accountant/maintenance-invoice-payment-dialog/maintenance-invoice-payment-dialog.component';
import {
  MaintenanceContractActionDialogComponent,
  MaintenanceContractActionDialogResult
} from '../maintenance-contract-action-dialog/maintenance-contract-action-dialog.component';
import {
  OwnerDraftRejectDialogComponent,
  OwnerDraftRejectDialogData
} from '../../owner/owner-draft-reject-dialog/owner-draft-reject-dialog.component';
import {
  OwnerTerminationDecisionDialogComponent,
  OwnerTerminationDecisionDialogData,
  OwnerTerminationDecisionDialogResult
} from '../../owner/owner-termination-decision-dialog/owner-termination-decision-dialog.component';
import {
  OwnerRenewalDecisionDialogComponent,
  OwnerRenewalDecisionDialogData,
  OwnerRenewalDecisionDialogResult
} from '../../owner/owner-renewal-decision-dialog/owner-renewal-decision-dialog.component';

@Component({
  selector: 'app-maintenance-contract-detail',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    TranslateModule,
    PageHeaderComponent,
    AuditTrailComponent,
    UploadZoneComponent,
    MaintenanceInvoicePaymentDialogComponent
  ],
  templateUrl: './maintenance-contract-detail.component.html',
  styleUrl: './maintenance-contract-detail.component.scss'
})
export class MaintenanceContractDetailComponent implements OnInit {
  loading = true;
  actionLoading = false;
  contractId!: number;
  contract: MaintenanceContractResponse | null = null;
  property: Property | null = null;
  invoices: MaintenanceContractInvoiceResponse[] = [];
  payingInvoiceId: number | null = null;
  receiptUrls: Record<number, string[]> = {};
  paymentNotes: Record<number, string> = {};
  targetInvoiceId: number | null = null;
  /** 0 = registration log, 1 = cancellation / termination log */
  logTab = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly invoiceSvc: MaintenanceContractInvoiceService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService,
    readonly auth: AuthService,
    readonly permissions: PermissionService
  ) {}

  ngOnInit(): void {
    this.contractId = Number(this.route.snapshot.paramMap.get('id'));
    const invoiceId = Number(this.route.snapshot.queryParamMap.get('invoiceId'));
    this.targetInvoiceId = Number.isFinite(invoiceId) && invoiceId > 0 ? invoiceId : null;
    this.loadAll();
  }

  goBack(): void {
    this.location.back();
  }

  loadAll(): void {
    this.loading = true;
    this.maintenanceContractSvc.getById(this.contractId).pipe(
      catchError(() => of(null))
    ).subscribe((res) => {
      this.contract = res?.data ?? null;
      if (!this.contract) {
        this.loading = false;
        this.snack.error(this.i18n.instant('MAINTENANCE.LOAD_ERROR'));
        return;
      }

      forkJoin({
        property: this.propertySvc.getById(this.contract.propertyId).pipe(catchError(() => of(null))),
        invoices: this.invoiceSvc.listByContract(this.contract.contractId).pipe(catchError(() => of(null)))
      }).subscribe(({ property, invoices }) => {
        this.property = property?.data ?? null;
        this.invoices = invoices?.data ?? [];
        this.invoices.forEach((invoice) => {
          if (invoice.receiptUrl && !this.receiptUrls[invoice.invoiceId]) {
            this.receiptUrls[invoice.invoiceId] = [invoice.receiptUrl];
          }
        });
        this.loading = false;
      });
    });
  }

  companyName(): string {
    if (!this.contract) return '-';
    return this.i18n.currentLang === 'ar'
      ? (this.contract.contractorCompanyNameAr || this.contract.contractorCompanyName || this.contract.contractorCompanyNameEn || '-')
      : (this.contract.contractorCompanyNameEn || this.contract.contractorCompanyName || this.contract.contractorCompanyNameAr || '-');
  }

  propertyName(): string {
    if (!this.property) return this.contract?.propertyId ? `#${this.contract.propertyId}` : '-';
    return this.i18n.currentLang === 'ar'
      ? (this.property.propertyNameAr || this.property.propertyName)
      : (this.property.propertyNameEn || this.property.propertyName);
  }

  daysUntilExpiry(): number | null {
    if (!this.contract?.endDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(this.contract.endDate);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / 86400000);
  }

  getStatusClass(status: string | null | undefined): string {
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
    return map[status || ''] ?? 'chip-default';
  }

  statusLabel(status: string | null | undefined): string {
    if (!status) return '-';
    const ar = this.i18n.currentLang === 'ar';
    const labelsAr: Record<string, string> = {
      DRAFT: 'مسودة عقد صيانة',
      PENDING_OWNER_APPROVAL: 'عقد صيانة بانتظار موافقة المالك',
      PENDING_TERMINATION_APPROVAL: 'طلب إنهاء عقد الصيانة بانتظار الموافقة',
      PENDING_RENEWAL_APPROVAL: 'طلب تجديد عقد الصيانة بانتظار الموافقة',
      ACTIVE: 'عقد صيانة نشط',
      EXPIRED: 'انتهاء عقد الصيانة',
      ENDED: 'انتهاء عقد الصيانة',
      CANCELLED: 'إلغاء عقد الصيانة',
      RENEWED: 'تم تجديد عقد الصيانة',
      SUSPENDED: 'عقد صيانة معلّق'
    };
    const labelsEn: Record<string, string> = {
      DRAFT: 'Maintenance contract draft',
      PENDING_OWNER_APPROVAL: 'Maintenance contract pending owner approval',
      PENDING_TERMINATION_APPROVAL: 'Maintenance termination pending approval',
      PENDING_RENEWAL_APPROVAL: 'Maintenance renewal pending approval',
      ACTIVE: 'Active maintenance contract',
      EXPIRED: 'Maintenance contract expired',
      ENDED: 'Maintenance contract ended',
      CANCELLED: 'Maintenance contract cancelled',
      RENEWED: 'Maintenance contract renewed',
      SUSPENDED: 'Maintenance contract suspended'
    };
    return (ar ? labelsAr : labelsEn)[status] ?? status;
  }

  propertyCode(): string {
    return this.contract?.propertyCode || this.property?.propertyCode || `#${this.contract?.propertyId ?? '-'}`;
  }

  fileNameFromUrl(url: string): string {
    const idx = url.lastIndexOf('/');
    return idx >= 0 ? url.slice(idx + 1) : url;
  }

  attachmentList(): string[] {
    const raw = this.contract?.attachmentUrls;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private allLogRows(): Array<{ date: string; actor: string; actionKey: string; action: string; detail: string }> {
    const raw = this.contract?.staffChangeLog ?? '';
    return raw.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(' | ').map((part) => part.trim());
        const key = parts[2] ?? '';
        return {
          date: parts[0] ?? '-',
          actor: parts[1] ?? '-',
          actionKey: key,
          action: this.actionLabel(key),
          detail: parts.slice(3).join(' | ') || '-'
        };
      })
      .reverse();
  }

  actionLogEntries() { return this.allLogRows(); }

  registrationLog() {
    return this.allLogRows().filter(r =>
      !r.actionKey.startsWith('RENEWAL_') &&
      !r.actionKey.startsWith('TERMINATION_') &&
      r.actionKey !== 'CANCELLED'
    );
  }

  renewalLog() {
    return this.allLogRows().filter(r => r.actionKey.startsWith('RENEWAL_'));
  }

  terminationLog() {
    return this.allLogRows().filter(r =>
      r.actionKey.startsWith('TERMINATION_') || r.actionKey === 'CANCELLED'
    );
  }

  actionLabel(action: string): string {
    const ar = this.i18n.currentLang === 'ar';
    const labelsAr: Record<string, string> = {
      CREATED: 'إنشاء العقد',
      APPROVED: 'اعتماد العقد',
      REJECTED: 'رفض العقد',
      CANCELLED: 'إلغاء العقد',
      PAYMENT_RECORDED: 'تسجيل دفعة للشركة',
      INVOICE_ISSUED: 'إصدار فاتورة للمحاسب',
      TERMINATION_REQUESTED: 'طلب إنهاء العقد',
      TERMINATION_APPROVED: 'اعتماد إنهاء العقد',
      TERMINATION_REJECTED: 'رفض إنهاء العقد',
      TERMINATION_REQUEST_CANCELLED: 'سحب طلب الإنهاء',
      RENEWAL_REQUESTED: 'طلب تجديد العقد',
      RENEWAL_APPROVED: 'اعتماد تجديد العقد',
      RENEWAL_REJECTED: 'رفض تجديد العقد',
      RENEWAL_REQUEST_CANCELLED: 'سحب طلب التجديد'
    };
    const labelsEn: Record<string, string> = {
      CREATED: 'Contract created',
      APPROVED: 'Contract approved',
      REJECTED: 'Contract rejected',
      CANCELLED: 'Contract cancelled',
      PAYMENT_RECORDED: 'Company payment recorded',
      INVOICE_ISSUED: 'Invoice issued for accountant',
      TERMINATION_REQUESTED: 'Termination requested',
      TERMINATION_APPROVED: 'Termination approved',
      TERMINATION_REJECTED: 'Termination rejected',
      TERMINATION_REQUEST_CANCELLED: 'Termination request withdrawn',
      RENEWAL_REQUESTED: 'Renewal requested',
      RENEWAL_APPROVED: 'Renewal approved',
      RENEWAL_REJECTED: 'Renewal rejected',
      RENEWAL_REQUEST_CANCELLED: 'Renewal request withdrawn'
    };
    return (ar ? labelsAr : labelsEn)[action] ?? (action || '-');
  }

  invoiceStatusLabel(status: string): string {
    const ar = this.i18n.currentLang === 'ar';
    const labelsAr: Record<string, string> = { PAID: 'مدفوعة', DRAFT: 'مسودة', ISSUED: 'صادرة', OVERDUE: 'متأخرة', CANCELLED: 'ملغاة' };
    const labelsEn: Record<string, string> = { PAID: 'Paid', DRAFT: 'Draft', ISSUED: 'Issued', OVERDUE: 'Overdue', CANCELLED: 'Cancelled' };
    return (ar ? labelsAr : labelsEn)[status] ?? status;
  }

  isTargetInvoice(invoice: MaintenanceContractInvoiceResponse): boolean {
    return this.targetInvoiceId === invoice.invoiceId;
  }

  canMarkInvoicePaid(invoice: MaintenanceContractInvoiceResponse): boolean {
    return invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  }

  setReceiptUrls(invoiceId: number, urls: string[]): void {
    this.receiptUrls[invoiceId] = urls;
  }

  markInvoicePaid(invoice: MaintenanceContractInvoiceResponse): void {
    const data: MaintenanceInvoicePaymentDialogData = { invoice, currency: this.contract?.currency || 'SAR' };
    this.dialog.open<MaintenanceInvoicePaymentDialogComponent, MaintenanceInvoicePaymentDialogData, MaintenanceInvoicePaymentDialogResult | null>(
      MaintenanceInvoicePaymentDialogComponent,
      {
        width: '760px',
        maxWidth: '96vw',
        panelClass: 'app-dialog-panel',
        data
      }
    ).afterClosed().subscribe((result) => {
      if (!result || result.type !== 'plan') return;
      this.payingInvoiceId = invoice.invoiceId;
      this.invoiceSvc.createPaymentPlan(invoice.invoiceId, result.payload).subscribe({
        next: () => {
          this.payingInvoiceId = null;
          this.snack.success(this.i18n.instant('MAINTENANCE_INVOICE_PAYMENT.PLAN_SAVED'));
          this.loadAll();
        },
        error: (err) => {
          this.payingInvoiceId = null;
          this.snack.error(err?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  payInstallment(invoice: MaintenanceContractInvoiceResponse, paymentId: number): void {
    const data: MaintenanceInvoicePaymentDialogData = {
      invoice,
      currency: this.contract?.currency || 'SAR',
      mode: 'installment',
      paymentId
    };
    this.dialog.open<MaintenanceInvoicePaymentDialogComponent, MaintenanceInvoicePaymentDialogData, MaintenanceInvoicePaymentDialogResult | null>(
      MaintenanceInvoicePaymentDialogComponent,
      {
        width: '640px',
        maxWidth: '96vw',
        panelClass: 'app-dialog-panel',
        data
      }
    ).afterClosed().subscribe((result) => {
      if (!result || result.type !== 'installment') return;
      this.payingInvoiceId = invoice.invoiceId;
      this.invoiceSvc.markInstallmentPaid(invoice.invoiceId, result.paymentId, result.payload).subscribe({
        next: () => {
          this.payingInvoiceId = null;
          this.snack.success(this.i18n.instant('MAINTENANCE_INVOICE_PAYMENT.INSTALLMENT_SAVED'));
          this.loadAll();
        },
        error: (err) => {
          this.payingInvoiceId = null;
          this.snack.error(err?.error?.message || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  pendingPayments(invoice: MaintenanceContractInvoiceResponse) {
    return (invoice.payments || []).filter(payment => payment.status === 'PENDING');
  }

  paidPayments(invoice: MaintenanceContractInvoiceResponse) {
    return (invoice.payments || []).filter(payment => payment.status === 'PAID');
  }

  hasPaymentPlan(invoice: MaintenanceContractInvoiceResponse): boolean {
    return (invoice.payments?.length || 0) > 0;
  }

  legacyMarkInvoicePaid(invoice: MaintenanceContractInvoiceResponse): void {
    this.payingInvoiceId = invoice.invoiceId;
    this.invoiceSvc.markPaid(invoice.invoiceId, {
      receiptUrl: this.receiptUrls[invoice.invoiceId]?.[0],
      notes: this.paymentNotes[invoice.invoiceId]
    }).subscribe({
      next: () => {
        this.payingInvoiceId = null;
        this.snack.success(this.i18n.instant('INLINE_TEXT.PAYMENT_RECORDED_AS_A_PROPERTY_EXPENSE'));
        this.loadAll();
      },
      error: (err) => {
        this.payingInvoiceId = null;
        this.snack.error(err?.error?.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  isPendingOwnerApproval(): boolean {
    const c = this.contract;
    if (!c) return false;
    return (c.status === 'DRAFT' || c.status === 'PENDING_OWNER_APPROVAL') &&
           c.ownerApprovalStatus === 'PENDING';
  }

  canDecideOwnerApproval(): boolean {
    return this.isPendingOwnerApproval() &&
      (this.permissions.can('owner_portal', 'approve') ||
       this.permissions.can('maintenance', 'manage') ||
       this.auth.isSuperAdmin() ||
       this.auth.isGeneralManager());
  }

  approveContract(): void {
    if (!this.contract || this.actionLoading) return;
    this.actionLoading = true;
    this.maintenanceContractSvc.decideDraft(this.contract.contractId, 'APPROVED').subscribe({
      next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('CONTRACTS.ACTIVATED_SUCCESS')); this.loadAll(); },
      error: (e: unknown) => {
        this.actionLoading = false;
        const msg = (e as { error?: { message?: string } })?.error?.message;
        this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  rejectContract(): void {
    if (!this.contract || this.actionLoading) return;
    this.dialog.open<OwnerDraftRejectDialogComponent, OwnerDraftRejectDialogData, string | null>(
      OwnerDraftRejectDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        data: { contractId: this.contract.contractId, contractNumber: this.contract.contractNumber ?? '' }
      }
    ).afterClosed().subscribe((reason) => {
      if (!reason) return;
      this.actionLoading = true;
      this.maintenanceContractSvc.decideDraft(this.contract!.contractId, 'REJECTED', reason).subscribe({
        next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('OWNER_PORTAL.REJECT_OK')); this.loadAll(); },
        error: (e: unknown) => {
          this.actionLoading = false;
          const msg = (e as { error?: { message?: string } })?.error?.message;
          this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  canRequestTermination(): boolean {
    if (this.contract?.status !== 'ACTIVE') return false;
    if (this.auth.hasRole('MAINTENANCE_COMPANY')) return true;
    return this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant();
  }

  canRequestRenewal(): boolean {
    if (this.contract?.status !== 'ACTIVE') return false;
    if (this.auth.hasRole('MAINTENANCE_COMPANY')) return true;
    return this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant();
  }

  isTerminationPending(): boolean {
    return this.contract?.status === 'PENDING_TERMINATION_APPROVAL';
  }

  isRenewalPending(): boolean {
    return this.contract?.status === 'PENDING_RENEWAL_APPROVAL';
  }

  canDecideTermination(): boolean {
    return this.isTerminationPending() &&
      (this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant() || this.auth.isOwner());
  }

  canDecideRenewal(): boolean {
    return this.isRenewalPending() &&
      (this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant() || this.auth.isOwner());
  }

  canCancelTerminationRequest(): boolean {
    if (!this.isTerminationPending()) return false;
    if (this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant()) return true;
    return false;
  }

  canCancelRenewalRequest(): boolean {
    if (!this.isRenewalPending()) return false;
    if (this.auth.isSuperAdmin() || this.auth.isGeneralManager() || this.auth.isAccountant()) return true;
    return false;
  }

  approveTermination(): void {
    if (!this.contract || this.actionLoading) return;
    const ar = this.i18n.currentLang === 'ar';
    const data: OwnerTerminationDecisionDialogData = {
      contractId: this.contract.contractId,
      contractNumber: this.contract.contractNumber,
      decision: 'APPROVED',
      terminationDate: this.contract.terminationProposedDate ?? undefined,
      terminationReason: this.contract.terminationRequestNotes ?? undefined,
      showSettlement: true,
      settlementLabel: ar ? 'مبلغ التسوية (اختياري)' : 'Settlement Amount (optional)',
      impactWarning: this.contract.propertyWillBeWithoutMaintenanceAfterTermination
        ? (ar ? 'تحذير: لن يكون للعقار عقد صيانة نشط بعد إنهاء هذا العقد.' : 'Warning: property will have no active maintenance contract after this termination.')
        : undefined
    };
    this.dialog.open<OwnerTerminationDecisionDialogComponent, OwnerTerminationDecisionDialogData, OwnerTerminationDecisionDialogResult | null>(
      OwnerTerminationDecisionDialogComponent, { width: '640px', maxWidth: '95vw', panelClass: 'app-dialog-panel', data }
    ).afterClosed().subscribe((result) => {
      if (!result) return;
      this.actionLoading = true;
      this.maintenanceContractSvc.staffDecideTermination(this.contract!.contractId, 'APPROVED', result.notes, result.settlementAmount).subscribe({
        next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadAll(); },
        error: (e: unknown) => { this.actionLoading = false; this.snack.error((e as { error?: { message?: string } })?.error?.message || this.i18n.instant('COMMON.ERROR')); }
      });
    });
  }

  rejectTermination(): void {
    if (!this.contract || this.actionLoading) return;
    const data: OwnerTerminationDecisionDialogData = {
      contractId: this.contract.contractId,
      contractNumber: this.contract.contractNumber,
      decision: 'REJECTED',
      terminationDate: this.contract.terminationProposedDate ?? undefined,
      terminationReason: this.contract.terminationRequestNotes ?? undefined
    };
    this.dialog.open<OwnerTerminationDecisionDialogComponent, OwnerTerminationDecisionDialogData, OwnerTerminationDecisionDialogResult | null>(
      OwnerTerminationDecisionDialogComponent, { width: '640px', maxWidth: '95vw', panelClass: 'app-dialog-panel', data }
    ).afterClosed().subscribe((result) => {
      if (!result) return;
      this.actionLoading = true;
      this.maintenanceContractSvc.staffDecideTermination(this.contract!.contractId, 'REJECTED', result.notes).subscribe({
        next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadAll(); },
        error: (e: unknown) => { this.actionLoading = false; this.snack.error((e as { error?: { message?: string } })?.error?.message || this.i18n.instant('COMMON.ERROR')); }
      });
    });
  }

  cancelTerminationRequest(): void {
    if (!this.contract || this.actionLoading) return;
    this.actionLoading = true;
    this.maintenanceContractSvc.cancelTerminationRequest(this.contract.contractId).subscribe({
      next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadAll(); },
      error: (e: unknown) => { this.actionLoading = false; this.snack.error((e as { error?: { message?: string } })?.error?.message || this.i18n.instant('COMMON.ERROR')); }
    });
  }

  approveRenewal(): void {
    if (!this.contract || this.actionLoading) return;
    const ar = this.i18n.currentLang === 'ar';
    const data: OwnerRenewalDecisionDialogData = {
      contractId: this.contract.contractId,
      contractNumber: this.contract.contractNumber,
      decision: 'APPROVED',
      details: [
        { label: ar ? 'تاريخ البداية المقترح' : 'Proposed start', value: this.contract.renewalProposedStartDate ?? '-' },
        { label: ar ? 'تاريخ الانتهاء المقترح' : 'Proposed end', value: this.contract.renewalProposedEndDate ?? '-' },
        ...(this.contract.renewalProposedValue != null ? [{ label: ar ? 'القيمة المقترحة' : 'Proposed value', value: String(this.contract.renewalProposedValue) }] : [])
      ]
    };
    this.dialog.open<OwnerRenewalDecisionDialogComponent, OwnerRenewalDecisionDialogData, OwnerRenewalDecisionDialogResult | null>(
      OwnerRenewalDecisionDialogComponent, { width: '640px', maxWidth: '95vw', panelClass: 'app-dialog-panel', data }
    ).afterClosed().subscribe((result) => {
      if (!result) return;
      this.actionLoading = true;
      this.maintenanceContractSvc.staffDecideRenewal(this.contract!.contractId, 'APPROVED', result.notes).subscribe({
        next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadAll(); },
        error: (e: unknown) => { this.actionLoading = false; this.snack.error((e as { error?: { message?: string } })?.error?.message || this.i18n.instant('COMMON.ERROR')); }
      });
    });
  }

  rejectRenewal(): void {
    if (!this.contract || this.actionLoading) return;
    const ar = this.i18n.currentLang === 'ar';
    const data: OwnerRenewalDecisionDialogData = {
      contractId: this.contract.contractId,
      contractNumber: this.contract.contractNumber,
      decision: 'REJECTED',
      details: [
        { label: ar ? 'تاريخ البداية المقترح' : 'Proposed start', value: this.contract.renewalProposedStartDate ?? '-' },
        { label: ar ? 'تاريخ الانتهاء المقترح' : 'Proposed end', value: this.contract.renewalProposedEndDate ?? '-' }
      ]
    };
    this.dialog.open<OwnerRenewalDecisionDialogComponent, OwnerRenewalDecisionDialogData, OwnerRenewalDecisionDialogResult | null>(
      OwnerRenewalDecisionDialogComponent, { width: '640px', maxWidth: '95vw', panelClass: 'app-dialog-panel', data }
    ).afterClosed().subscribe((result) => {
      if (!result) return;
      this.actionLoading = true;
      this.maintenanceContractSvc.staffDecideRenewal(this.contract!.contractId, 'REJECTED', result.notes).subscribe({
        next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadAll(); },
        error: (e: unknown) => { this.actionLoading = false; this.snack.error((e as { error?: { message?: string } })?.error?.message || this.i18n.instant('COMMON.ERROR')); }
      });
    });
  }

  cancelRenewalRequest(): void {
    if (!this.contract || this.actionLoading) return;
    this.actionLoading = true;
    this.maintenanceContractSvc.cancelRenewalRequest(this.contract.contractId).subscribe({
      next: () => { this.actionLoading = false; this.snack.success(this.i18n.instant('COMMON.SAVED')); this.loadAll(); },
      error: (e: unknown) => { this.actionLoading = false; this.snack.error((e as { error?: { message?: string } })?.error?.message || this.i18n.instant('COMMON.ERROR')); }
    });
  }

  requestTermination(): void {
    if (!this.contract || this.actionLoading) return;
    this.dialog.open<MaintenanceContractActionDialogComponent, unknown, MaintenanceContractActionDialogResult | null>(
      MaintenanceContractActionDialogComponent,
      {
        width: '620px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        data: {
          action: 'termination',
          contractNumber: this.contract.contractNumber,
          currentEndDate: this.contract.endDate
        }
      }
    ).afterClosed().subscribe((result) => {
      if (!result?.terminationDate) return;

      this.actionLoading = true;
      this.maintenanceContractSvc.terminate(this.contract!.contractId, {
        terminationDate: result.terminationDate,
        reason: result.reason
      }).subscribe({
        next: () => {
          this.actionLoading = false;
          this.snack.success(this.i18n.instant('COMMON.SAVED'));
          this.loadAll();
        },
        error: () => {
          this.actionLoading = false;
          this.snack.error(this.i18n.instant('MAINTENANCE.SAVE_ERROR'));
        }
      });
    });
  }

  requestRenewal(): void {
    if (!this.contract || this.actionLoading) return;
    this.dialog.open<MaintenanceContractActionDialogComponent, unknown, MaintenanceContractActionDialogResult | null>(
      MaintenanceContractActionDialogComponent,
      {
        width: '620px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        data: {
          action: 'renewal',
          contractNumber: this.contract.contractNumber,
          currentEndDate: this.contract.endDate,
          currentValue: this.contract.contractValue
        }
      }
    ).afterClosed().subscribe((result) => {
      if (!result?.proposedStartDate || !result.proposedEndDate) return;

      this.actionLoading = true;
      this.maintenanceContractSvc.requestRenewal(this.contract!.contractId, {
        proposedStartDate: result.proposedStartDate,
        proposedEndDate: result.proposedEndDate,
        proposedValue: result.proposedValue,
        note: result.note
      }).subscribe({
        next: () => {
          this.actionLoading = false;
          this.snack.success(this.i18n.instant('COMMON.SAVED'));
          this.loadAll();
        },
        error: () => {
          this.actionLoading = false;
          this.snack.error(this.i18n.instant('MAINTENANCE.SAVE_ERROR'));
        }
      });
    });
  }
}

