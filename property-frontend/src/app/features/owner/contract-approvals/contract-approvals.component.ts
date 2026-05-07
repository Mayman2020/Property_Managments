import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContractService } from '../../../core/services/contract.service';
import { OwnerPortalService } from '../../../core/services/owner-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';
import { OwnerDraftRejectDialogComponent } from '../owner-draft-reject-dialog.component';
import { OwnerDraftAmendDialogComponent } from '../owner-draft-amend-dialog.component';
import {
  OwnerTerminationDecisionDialogComponent,
  OwnerTerminationDecisionDialogResult
} from '../owner-termination-decision-dialog.component';
import {
  OwnerRenewalDecisionDialogComponent,
  OwnerRenewalDecisionDialogResult
} from '../owner-renewal-decision-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-contract-approvals',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule,
    PageHeaderComponent
  ],
  templateUrl: './contract-approvals.component.html',
  styleUrl: './contract-approvals.component.scss'
})
export class ContractApprovalsComponent implements OnInit {
  contracts: LeaseContract[] = [];
  pendingTerminations: LeaseContract[] = [];
  pendingRenewals: LeaseContract[] = [];
  loading = true;
  loadingTerminations = true;
  loadingRenewals = true;
  activating: Record<number, boolean> = {};
  busyReject: Record<number, boolean> = {};
  busyAmend: Record<number, boolean> = {};
  busyTerminationDecision: Record<number, boolean> = {};
  busyRenewalDecision: Record<number, boolean> = {};
  readonly isOwner: boolean;

  constructor(
    private readonly contractSvc: ContractService,
    private readonly ownerPortal: OwnerPortalService,
    private readonly auth: AuthService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.isOwner = this.auth.hasRole('OWNER');
  }

  ngOnInit(): void {
    this.load();
    this.loadPendingTerminations();
    this.loadPendingRenewals();
  }

  load(): void {
    this.loading = true;
    const req = this.isOwner
      ? this.ownerPortal.getDraftContracts()
      : this.contractSvc.getAll({ status: 'DRAFT', size: 200 });
    req.subscribe({
      next: (res) => {
        const raw = res.data?.content ?? res.data ?? [];
        this.contracts = Array.isArray(raw) ? raw : [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadPendingTerminations(): void {
    this.loadingTerminations = true;
    const req = this.isOwner
      ? this.ownerPortal.getPendingTerminations()
      : this.contractSvc.getAll({ status: 'PENDING_TERMINATION_APPROVAL', size: 200 });
    req.subscribe({
      next: (res) => {
        const raw = res.data?.content ?? res.data ?? [];
        this.pendingTerminations = Array.isArray(raw) ? raw : [];
        this.loadingTerminations = false;
      },
      error: () => { this.loadingTerminations = false; }
    });
  }

  loadPendingRenewals(): void {
    this.loadingRenewals = true;
    const req = this.isOwner
      ? this.ownerPortal.getPendingRenewals()
      : this.contractSvc.getAll({ status: 'PENDING_RENEWAL_APPROVAL', size: 200 });
    req.subscribe({
      next: (res) => {
        const raw = res.data?.content ?? res.data ?? [];
        this.pendingRenewals = Array.isArray(raw) ? raw : [];
        this.loadingRenewals = false;
      },
      error: () => { this.loadingRenewals = false; }
    });
  }

  furnishedLabel(status?: string): string {
    if (!status) return '';
    const map: Record<string, string> = {
      FURNISHED: this.i18n.instant('UNIT_DETAILS.FURNISHED'),
      UNFURNISHED: this.i18n.instant('UNIT_DETAILS.UNFURNISHED'),
      SEMI_FURNISHED: this.i18n.instant('UNIT_DETAILS.SEMI_FURNISHED')
    };
    return map[status] ?? status;
  }

  discountLabel(reason?: string): string {
    if (!reason) return '';
    const map: Record<string, string> = {
      OWNER_AGREEMENT: this.i18n.instant('CONTRACTS.DISCOUNT_OWNER_AGREEMENT'),
      OLD_TENANT: this.i18n.instant('CONTRACTS.DISCOUNT_OLD_TENANT'),
      OTHER: this.i18n.instant('CONTRACTS.DISCOUNT_OTHER')
    };
    return map[reason] ?? reason;
  }

  activate(contract: LeaseContract): void {
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد قبول العقد' : 'Confirm Contract Approval',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من قبول العقد وتفعيله؟'
        : 'Are you sure you want to approve and activate this contract?'
    ).subscribe((ok) => {
      if (!ok) return;
      this.activating[contract.id] = true;
      this.contractSvc.activate(contract.id).subscribe({
        next: () => {
          this.activating[contract.id] = false;
          this.snack.success(this.i18n.instant('CONTRACTS.ACTIVATED_SUCCESS'));
          this.load();
        },
        error: (e: unknown) => {
          this.activating[contract.id] = false;
          const msg = (e as { error?: { message?: string } })?.error?.message;
          this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  openReject(c: LeaseContract): void {
    if (!this.isOwner) return;
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من متابعة رفض العقد؟'
        : 'Are you sure you want to continue with rejecting this contract?'
    ).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerDraftRejectDialogComponent, {
        width: '440px',
        data: { contractId: c.id, contractNumber: c.contractNumber }
      }).afterClosed().subscribe((reason: string | null | undefined) => {
        if (!reason) return;
        this.busyReject[c.id] = true;
        this.ownerPortal.rejectDraftContract(c.id, reason).subscribe({
          next: () => {
            this.busyReject[c.id] = false;
            this.snack.success(this.i18n.instant('OWNER_PORTAL.REJECT_OK'));
            this.load();
          },
          error: (e: unknown) => {
            this.busyReject[c.id] = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
    });
  }

  openTerminationDecision(c: LeaseContract, decision: 'APPROVED' | 'REJECTED'): void {
    if (!this.isOwner && !this.auth.hasRole('SUPER_ADMIN') && !this.auth.hasRole('GENERAL_MANAGER')) return;
    const msgAr = decision === 'APPROVED'
      ? 'هل أنت متأكد من متابعة الموافقة على إنهاء العقد؟'
      : 'هل أنت متأكد من متابعة رفض طلب إنهاء العقد؟';
    const msgEn = decision === 'APPROVED'
      ? 'Are you sure you want to continue approving the contract termination?'
      : 'Are you sure you want to continue rejecting the contract termination request?';
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar' ? msgAr : msgEn
    ).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerTerminationDecisionDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        disableClose: true,
        data: {
          contractId: c.id,
          contractNumber: c.contractNumber,
          decision,
          terminationDate: c.terminationDate,
          terminationReason: c.terminationReason
        }
      }).afterClosed().subscribe((result: OwnerTerminationDecisionDialogResult | null | undefined) => {
        if (!result) return;
        this.busyTerminationDecision[c.id] = true;
        this.ownerPortal.decideTermination(c.id, { decision: result.decision, notes: result.notes }).subscribe({
          next: () => {
            this.busyTerminationDecision[c.id] = false;
            const okKey = result.decision === 'APPROVED'
              ? 'OWNER_PORTAL.TERMINATION_APPROVE_OK'
              : 'OWNER_PORTAL.TERMINATION_REJECT_OK';
            this.snack.success(this.i18n.instant(okKey));
            this.loadPendingTerminations();
          },
          error: (e: unknown) => {
            this.busyTerminationDecision[c.id] = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
    });
  }

  openRenewalDecision(c: LeaseContract, decision: 'APPROVED' | 'REJECTED'): void {
    if (!this.isOwner && !this.auth.hasRole('SUPER_ADMIN') && !this.auth.hasRole('GENERAL_MANAGER')) return;
    const msgAr = decision === 'APPROVED'
      ? 'هل أنت متأكد من متابعة الموافقة على التجديد؟'
      : 'هل أنت متأكد من متابعة رفض طلب التجديد؟';
    const msgEn = decision === 'APPROVED'
      ? 'Are you sure you want to continue approving this renewal?'
      : 'Are you sure you want to continue rejecting this renewal request?';
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar' ? msgAr : msgEn
    ).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerRenewalDecisionDialogComponent, {
        width: '480px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        disableClose: true,
        data: { contractId: c.id, contractNumber: c.contractNumber, decision }
      }).afterClosed().subscribe((result: OwnerRenewalDecisionDialogResult | null | undefined) => {
        if (!result) return;
        this.busyRenewalDecision[c.id] = true;
        this.ownerPortal.decideRenewal(c.id, { decision: result.decision, notes: result.notes }).subscribe({
          next: () => {
            this.busyRenewalDecision[c.id] = false;
            this.snack.success(this.i18n.instant(
              result.decision === 'APPROVED'
                ? 'OWNER_PORTAL.RENEWALS.APPROVE_OK'
                : 'OWNER_PORTAL.RENEWALS.REJECT_OK'));
            this.loadPendingRenewals();
          },
          error: (e: unknown) => {
            this.busyRenewalDecision[c.id] = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
    });
  }

  openAmend(c: LeaseContract): void {
    if (!this.isOwner) return;
    this.openActionConfirm(
      this.i18n.currentLang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
      this.i18n.currentLang === 'ar'
        ? 'هل أنت متأكد من متابعة تعديل العقد؟'
        : 'Are you sure you want to continue amending this contract?'
    ).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerDraftAmendDialogComponent, {
        width: '480px',
        data: {
          contractId: c.id,
          contractNumber: c.contractNumber,
          currentUnitId: c.unitId,
          currentRent: c.monthlyRent
        }
      }).afterClosed().subscribe((payload: { unitId?: number; monthlyRent?: number; reason: string } | null | undefined) => {
        if (!payload) return;
        this.busyAmend[c.id] = true;
        this.ownerPortal.amendDraftContract(c.id, payload).subscribe({
          next: () => {
            this.busyAmend[c.id] = false;
            this.snack.success(this.i18n.instant('OWNER_PORTAL.AMEND_OK'));
            this.load();
          },
          error: (e: unknown) => {
            this.busyAmend[c.id] = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
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
}
