import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ContractService } from '../../../core/services/contract.service';
import { OwnerPortalService } from '../../../core/services/owner-portal.service';
import { MaintenanceContractResponse, MaintenanceContractService } from '../../../core/services/maintenance-contract.service';
import { AuthService } from '../../../core/services/auth.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';
import { OwnerDraftRejectDialogComponent } from '../owner-draft-reject-dialog/owner-draft-reject-dialog.component';
import { OwnerDraftAmendDialogComponent } from '../owner-draft-amend-dialog/owner-draft-amend-dialog.component';
import {
  OwnerDecisionDetailRow,
  OwnerTerminationDecisionDialogComponent,
  OwnerTerminationDecisionDialogResult
} from '../owner-termination-decision-dialog/owner-termination-decision-dialog.component';
import {
  OwnerRenewalDecisionDialogComponent,
  OwnerRenewalDecisionDialogResult
} from '../owner-renewal-decision-dialog/owner-renewal-decision-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-contract-approvals',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, RouterLink,
    TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule, MatTabsModule,
    PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './contract-approvals.component.html',
  styleUrl: './contract-approvals.component.scss'
})
export class ContractApprovalsComponent implements OnInit {
  contracts: LeaseContract[] = [];
  pendingTerminations: LeaseContract[] = [];
  pendingRenewals: LeaseContract[] = [];
  maintenanceDrafts: MaintenanceContractResponse[] = [];
  maintenancePendingTerminations: MaintenanceContractResponse[] = [];
  maintenancePendingRenewals: MaintenanceContractResponse[] = [];
  loading = true;
  loadingTerminations = true;
  loadingRenewals = true;
  loadingMaintenanceDrafts = true;
  loadingMaintenanceTerminations = true;
  loadingMaintenanceRenewals = true;
  activating: Record<number, boolean> = {};
  busyReject: Record<number, boolean> = {};
  busyAmend: Record<number, boolean> = {};
  busyTerminationDecision: Record<number, boolean> = {};
  busyRenewalDecision: Record<number, boolean> = {};
  readonly isOwner: boolean;
  readonly pageSize = 6;
  contractsPage = 0;
  terminationsPage = 0;
  renewalsPage = 0;
  maintenanceDraftsPage = 0;
  maintenanceTerminationsPage = 0;
  maintenanceRenewalsPage = 0;
  selectedTab = 0;

  get isFullyLoaded(): boolean {
    return !this.loading && !this.loadingTerminations && !this.loadingRenewals
      && !this.loadingMaintenanceDrafts && !this.loadingMaintenanceTerminations && !this.loadingMaintenanceRenewals;
  }

  get hasAnyApprovals(): boolean {
    return this.contracts.length > 0
      || this.pendingTerminations.length > 0
      || this.pendingRenewals.length > 0
      || this.maintenanceDrafts.length > 0
      || this.maintenancePendingTerminations.length > 0
      || this.maintenancePendingRenewals.length > 0;
  }

  get pagedContracts() { return this.contracts.slice(this.contractsPage * this.pageSize, (this.contractsPage + 1) * this.pageSize); }
  get pagedTerminations() { return this.pendingTerminations.slice(this.terminationsPage * this.pageSize, (this.terminationsPage + 1) * this.pageSize); }
  get pagedRenewals() { return this.pendingRenewals.slice(this.renewalsPage * this.pageSize, (this.renewalsPage + 1) * this.pageSize); }
  get pagedMaintenanceDrafts() { return this.maintenanceDrafts.slice(this.maintenanceDraftsPage * this.pageSize, (this.maintenanceDraftsPage + 1) * this.pageSize); }
  get pagedMaintenanceTerminations() { return this.maintenancePendingTerminations.slice(this.maintenanceTerminationsPage * this.pageSize, (this.maintenanceTerminationsPage + 1) * this.pageSize); }
  get pagedMaintenanceRenewals() { return this.maintenancePendingRenewals.slice(this.maintenanceRenewalsPage * this.pageSize, (this.maintenanceRenewalsPage + 1) * this.pageSize); }

  constructor(
    private readonly contractSvc: ContractService,
    private readonly ownerPortal: OwnerPortalService,
    private readonly maintenanceContractSvc: MaintenanceContractService,
    private readonly auth: AuthService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    private readonly route: ActivatedRoute,
    readonly i18n: I18nService
  ) {
    this.isOwner = this.auth.hasRole('OWNER');
  }

  ngOnInit(): void {
    this.applyTabFromQuery();
    this.load();
    this.loadPendingTerminations();
    this.loadPendingRenewals();
    this.loadMaintenanceDrafts();
    this.loadMaintenancePendingTerminations();
    this.loadMaintenancePendingRenewals();
  }

  private applyTabFromQuery(): void {
    const tab = (this.route.snapshot.queryParamMap.get('tab') ?? '').toLowerCase();
    const tabIndex: Record<string, number> = {
      drafts: 0,
      terminations: 1,
      renewals: 2,
      'maintenance-drafts': 3,
      'maintenance-terminations': 4,
      'maintenance-renewals': 5
    };
    if (tab in tabIndex) {
      this.selectedTab = tabIndex[tab];
    }
  }

  private maybeSyncSelectedTab(): void {
    if (!this.isFullyLoaded || !this.hasAnyApprovals) return;
    const counts = [
      this.contracts.length,
      this.pendingTerminations.length,
      this.pendingRenewals.length,
      this.maintenanceDrafts.length,
      this.maintenancePendingTerminations.length,
      this.maintenancePendingRenewals.length
    ];
    if (counts[this.selectedTab] > 0) return;
    const first = counts.findIndex(c => c > 0);
    if (first >= 0) this.selectedTab = first;
  }

  load(): void {
    this.loading = true;
    if (this.isOwner) {
      forkJoin({
        drafts: this.ownerPortal.getDraftContracts(),
        pending: this.ownerPortal.getPendingApprovals()
      }).subscribe({
        next: ({ drafts, pending }) => {
          const merged = [...(drafts.data ?? []), ...(pending.data ?? [])];
          const byId = new Map<number, LeaseContract>();
          merged.forEach((c) => byId.set(c.id, c));
          this.contracts = Array.from(byId.values());
          this.loading = false;
          this.maybeSyncSelectedTab();
        },
        error: () => { this.loading = false; this.maybeSyncSelectedTab(); }
      });
      return;
    }
    forkJoin({
      draft: this.contractSvc.getAll({ status: 'DRAFT', size: 200 }),
      pending: this.contractSvc.getAll({ status: 'PENDING_OWNER_APPROVAL', size: 200 })
    }).subscribe({
      next: ({ draft, pending }) => {
        const d = draft.data?.content ?? draft.data ?? [];
        const p = pending.data?.content ?? pending.data ?? [];
        const merged = [...(Array.isArray(d) ? d : []), ...(Array.isArray(p) ? p : [])];
        const byId = new Map<number, LeaseContract>();
        merged.forEach((c) => byId.set(c.id, c));
        this.contracts = Array.from(byId.values());
        this.loading = false;
        this.maybeSyncSelectedTab();
      },
      error: () => { this.loading = false; this.maybeSyncSelectedTab(); }
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
        this.maybeSyncSelectedTab();
      },
      error: () => { this.loadingTerminations = false; this.maybeSyncSelectedTab(); }
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
        this.maybeSyncSelectedTab();
      },
      error: () => { this.loadingRenewals = false; this.maybeSyncSelectedTab(); }
    });
  }

  loadMaintenanceDrafts(): void {
    this.loadingMaintenanceDrafts = true;
    const req = this.isOwner
      ? this.maintenanceContractSvc.getOwnerDrafts()
      : this.maintenanceContractSvc.listAll();
    req.subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        this.maintenanceDrafts = (Array.isArray(rows) ? rows : []).filter((c) => c.status === 'DRAFT');
        this.loadingMaintenanceDrafts = false;
        this.maybeSyncSelectedTab();
      },
      error: () => { this.loadingMaintenanceDrafts = false; this.maybeSyncSelectedTab(); }
    });
  }

  loadMaintenancePendingTerminations(): void {
    this.loadingMaintenanceTerminations = true;
    const req = this.isOwner
      ? this.maintenanceContractSvc.getOwnerPendingTerminations()
      : this.maintenanceContractSvc.listAll();
    req.subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        this.maintenancePendingTerminations = (Array.isArray(rows) ? rows : [])
          .filter((c) => c.status === 'PENDING_TERMINATION_APPROVAL');
        this.loadingMaintenanceTerminations = false;
        this.maybeSyncSelectedTab();
      },
      error: () => { this.loadingMaintenanceTerminations = false; this.maybeSyncSelectedTab(); }
    });
  }

  loadMaintenancePendingRenewals(): void {
    this.loadingMaintenanceRenewals = true;
    const req = this.isOwner
      ? this.maintenanceContractSvc.getOwnerPendingRenewals()
      : this.maintenanceContractSvc.listAll();
    req.subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        this.maintenancePendingRenewals = (Array.isArray(rows) ? rows : [])
          .filter((c) => c.status === 'PENDING_RENEWAL_APPROVAL');
        this.loadingMaintenanceRenewals = false;
        this.maybeSyncSelectedTab();
      },
      error: () => { this.loadingMaintenanceRenewals = false; this.maybeSyncSelectedTab(); }
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
      this.i18n.instant('INLINE_TEXT.CONFIRM_CONTRACT_APPROVAL'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_APPROVE_AND_ACTIVATE_THIS_CONT')
    ).subscribe((ok) => {
      if (!ok) return;
      this.activating[contract.id] = true;
      const approve$ = this.isOwner && contract.status === 'PENDING_OWNER_APPROVAL'
        ? this.ownerPortal.submitContractDecision(contract.id, { decision: 'APPROVED' })
        : this.contractSvc.activate(contract.id);
      approve$.subscribe({
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
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CONTINUE_WITH_REJECTING_THIS_C')
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
    const messageKey = decision === 'APPROVED'
      ? 'INLINE_TEXT.CONFIRM_APPROVE_TERMINATION'
      : 'INLINE_TEXT.CONFIRM_REJECT_TERMINATION';
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant(messageKey)
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
    const messageKey = decision === 'APPROVED'
      ? 'INLINE_TEXT.CONFIRM_APPROVE_RENEWAL'
      : 'INLINE_TEXT.CONFIRM_REJECT_RENEWAL';
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant(messageKey)
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

  activateMaintenance(c: MaintenanceContractResponse): void {
    this.openActionConfirm(
      this.i18n.instant('OWNER_PORTAL.MAINTENANCE_APPROVE_CONFIRM_TITLE'),
      this.i18n.instant('OWNER_PORTAL.MAINTENANCE_APPROVE_CONFIRM_MESSAGE')
    ).subscribe((ok) => {
      if (!ok) return;
      this.activating[c.contractId] = true;
      this.maintenanceContractSvc.decideDraft(c.contractId, 'APPROVED').subscribe({
        next: () => {
          this.activating[c.contractId] = false;
          this.snack.success(this.i18n.instant('CONTRACTS.ACTIVATED_SUCCESS'));
          this.loadMaintenanceDrafts();
        },
        error: (e: unknown) => {
          this.activating[c.contractId] = false;
          const msg = (e as { error?: { message?: string } })?.error?.message;
          this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
        }
      });
    });
  }

  rejectMaintenance(c: MaintenanceContractResponse): void {
    this.openActionConfirm(
      this.i18n.instant('INLINE_TEXT.CONFIRM_MAINTENANCE_CONTRACT_REJECTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_REJECT_THIS_MAINTENANCE_CONTRA'),
      { danger: true, confirmLabel: this.i18n.instant('INLINE_TEXT.REJECT') }
    ).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerDraftRejectDialogComponent, {
        width: '440px',
        data: { contractId: c.contractId, contractNumber: c.contractNumber }
      }).afterClosed().subscribe((reason: string | null | undefined) => {
        if (!reason) return;
        this.busyReject[c.contractId] = true;
        this.maintenanceContractSvc.decideDraft(c.contractId, 'REJECTED', reason).subscribe({
          next: () => {
            this.busyReject[c.contractId] = false;
            this.snack.success(this.i18n.instant('OWNER_PORTAL.REJECT_OK'));
            this.loadMaintenanceDrafts();
          },
          error: (e: unknown) => {
            this.busyReject[c.contractId] = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
    });
  }

  openMaintenanceTerminationDecision(c: MaintenanceContractResponse, decision: 'APPROVED' | 'REJECTED'): void {
    const confirm = this.maintenanceDecisionConfirm('termination', decision);
    this.openActionConfirm(confirm.title, confirm.message, {
      danger: decision === 'REJECTED',
      confirmLabel: confirm.confirmLabel
    }).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerTerminationDecisionDialogComponent, {
        width: '780px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        disableClose: true,
        data: {
          contractId: c.contractId,
          contractNumber: c.contractNumber,
          decision,
          title: this.maintenanceTerminationDialogTitle(decision),
          subtitle: this.maintenanceTerminationDialogSubtitle(c, decision),
          noticeLabel: this.i18n.instant('INLINE_TEXT.MAINTENANCE_CONTRACT_CANCELLATION_NOTICE'),
          terminationDate: this.formatDate(c.terminationProposedDate),
          terminationReason: c.terminationRequestNotes,
          propertyDetailsTitle: this.i18n.instant('INLINE_TEXT.PROPERTY_DETAILS'),
          propertyDetails: this.maintenancePropertyDetails(c),
          details: this.maintenanceDecisionDetails(c, 'termination'),
          impactWarning: this.maintenanceTerminationImpact(c)
        }
      }).afterClosed().subscribe((result: OwnerTerminationDecisionDialogResult | null | undefined) => {
        if (!result) return;
        this.busyTerminationDecision[c.contractId] = true;
        this.maintenanceContractSvc.decideTermination(c.contractId, result.decision, result.notes).subscribe({
          next: () => {
            this.busyTerminationDecision[c.contractId] = false;
            this.snack.success(this.i18n.instant(result.decision === 'APPROVED'
              ? 'OWNER_PORTAL.TERMINATION_APPROVE_OK'
              : 'OWNER_PORTAL.TERMINATION_REJECT_OK'));
            this.loadMaintenancePendingTerminations();
          },
          error: (e: unknown) => {
            this.busyTerminationDecision[c.contractId] = false;
            const msg = (e as { error?: { message?: string } })?.error?.message;
            this.snack.error(msg || this.i18n.instant('COMMON.ERROR'));
          }
        });
      });
    });
  }

  openMaintenanceRenewalDecision(c: MaintenanceContractResponse, decision: 'APPROVED' | 'REJECTED'): void {
    const confirm = this.maintenanceDecisionConfirm('renewal', decision);
    this.openActionConfirm(confirm.title, confirm.message, {
      danger: decision === 'REJECTED',
      confirmLabel: confirm.confirmLabel
    }).subscribe((ok) => {
      if (!ok) return;
      this.dialog.open(OwnerRenewalDecisionDialogComponent, {
        width: '780px',
        maxWidth: '95vw',
        panelClass: 'app-dialog-panel',
        disableClose: true,
        data: {
          contractId: c.contractId,
          contractNumber: c.contractNumber,
          decision,
          details: this.maintenanceDecisionDetails(c, 'renewal'),
          impactWarning: this.maintenanceRenewalImpact(c)
        }
      }).afterClosed().subscribe((result: OwnerRenewalDecisionDialogResult | null | undefined) => {
        if (!result) return;
        this.busyRenewalDecision[c.contractId] = true;
        this.maintenanceContractSvc.decideRenewal(c.contractId, result.decision, result.notes).subscribe({
          next: () => {
            this.busyRenewalDecision[c.contractId] = false;
            this.snack.success(this.i18n.instant(result.decision === 'APPROVED'
              ? 'OWNER_PORTAL.RENEWALS.APPROVE_OK'
              : 'OWNER_PORTAL.RENEWALS.REJECT_OK'));
            this.loadMaintenancePendingRenewals();
          },
          error: (e: unknown) => {
            this.busyRenewalDecision[c.contractId] = false;
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
      this.i18n.instant('INLINE_TEXT.CONFIRM_ACTION'),
      this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_CONTINUE_AMENDING_THIS_CONTRAC')
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

  private openActionConfirm(
    title: string,
    message: string,
    options?: { danger?: boolean; confirmLabel?: string; icon?: ConfirmDialogData['icon'] }
  ) {
    return this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {
        title,
        message,
        confirmLabel: options?.confirmLabel || (this.i18n.instant('INLINE_TEXT.OK')),
        cancelLabel: this.i18n.instant('INLINE_TEXT.CANCEL'),
        danger: options?.danger,
        icon: options?.icon || 'warning'
      } as ConfirmDialogData
    }).afterClosed();
  }

  private maintenanceDecisionConfirm(
    action: 'termination' | 'renewal',
    decision: 'APPROVED' | 'REJECTED'
  ): { title: string; message: string; confirmLabel: string } {
    const isAr = this.i18n.currentLang === 'ar';
    const approving = decision === 'APPROVED';
    if (action === 'termination') {
      return {
        title: isAr
          ? (approving ? 'تأكيد الموافقة على إلغاء عقد الصيانة' : 'تأكيد رفض إلغاء عقد الصيانة')
          : (approving ? 'Confirm Maintenance Contract Cancellation' : 'Confirm Cancellation Rejection'),
        message: isAr
          ? (approving ? 'هل أنت متأكد من الموافقة على إلغاء عقد الصيانة؟' : 'هل أنت متأكد من رفض طلب إلغاء عقد الصيانة؟')
          : (approving ? 'Are you sure you want to approve cancelling this maintenance contract?' : 'Are you sure you want to reject this maintenance cancellation request?'),
        confirmLabel: isAr ? (approving ? 'موافقة' : 'رفض') : (approving ? 'Approve' : 'Reject')
      };
    }
    return {
      title: isAr
        ? (approving ? 'تأكيد الموافقة على تجديد عقد الصيانة' : 'تأكيد رفض تجديد عقد الصيانة')
        : (approving ? 'Confirm Maintenance Contract Renewal' : 'Confirm Renewal Rejection'),
      message: isAr
        ? (approving ? 'هل أنت متأكد من الموافقة على تجديد عقد الصيانة؟' : 'هل أنت متأكد من رفض طلب تجديد عقد الصيانة؟')
        : (approving ? 'Are you sure you want to approve renewing this maintenance contract?' : 'Are you sure you want to reject this maintenance renewal request?'),
      confirmLabel: isAr ? (approving ? 'موافقة' : 'رفض') : (approving ? 'Approve' : 'Reject')
    };
  }

  private maintenanceDecisionDetails(c: MaintenanceContractResponse, action: 'termination' | 'renewal'): OwnerDecisionDetailRow[] {
    const rows: OwnerDecisionDetailRow[] = [];
    const isAr = this.i18n.currentLang === 'ar';
    const requestedBy = action === 'termination' ? c.terminationRequestedByName : c.renewalRequestedByName;
    const requestedAt = action === 'termination' ? c.terminationRequestedAt : c.renewalRequestedAt;
    rows.push({ label: this.i18n.instant('INLINE_TEXT.REQUESTED_BY'), value: requestedBy || (this.i18n.instant('INLINE_TEXT.NOT_AVAILABLE')) });
    if (requestedAt) rows.push({ label: this.i18n.instant('INLINE_TEXT.REQUEST_DATE'), value: this.formatDateTime(requestedAt) });
    rows.push({ label: this.i18n.instant('INLINE_TEXT.LINKED_PROPERTY'), value: this.maintenancePropertyLabel(c) });
    rows.push({ label: this.i18n.instant('INLINE_TEXT.CURRENT_MAINTENANCE_COMPANY'), value: this.maintenanceCompanyLabel(c) });
    rows.push({ label: this.i18n.instant('INLINE_TEXT.CONTRACT_DURATION'), value: this.contractDurationLabel(c) });
    rows.push({ label: this.i18n.instant('INLINE_TEXT.ELAPSED_DURATION'), value: this.contractProgressLabel(c) });
    rows.push({
      label: this.i18n.instant('INLINE_TEXT.OTHER_ACTIVE_MAINTENANCE_CONTRACTS'),
      value: String(c.otherActiveMaintenanceContractsForProperty ?? 0),
      tone: (c.otherActiveMaintenanceContractsForProperty ?? 0) > 0 ? 'success' : 'warn'
    });
    if (action === 'renewal') {
      if (c.renewalProposedStartDate) rows.push({ label: this.i18n.instant('INLINE_TEXT.PROPOSED_RENEWAL_START'), value: this.formatDate(c.renewalProposedStartDate) });
      if (c.renewalProposedEndDate) rows.push({ label: this.i18n.instant('INLINE_TEXT.PROPOSED_RENEWAL_END'), value: this.formatDate(c.renewalProposedEndDate) });
      if (c.renewalProposedValue != null) rows.push({ label: this.i18n.instant('INLINE_TEXT.PROPOSED_RENEWAL_VALUE'), value: `${this.formatNumber(c.renewalProposedValue)} ${c.currency || 'SAR'}` });
    }
    return rows;
  }

  private maintenancePropertyDetails(c: MaintenanceContractResponse): OwnerDecisionDetailRow[] {
    const isAr = this.i18n.currentLang === 'ar';
    return [
      {
        label: this.i18n.instant('INLINE_TEXT.PROPERTY_CODE'),
        value: c.propertyCode || (c.propertyId != null ? `#${c.propertyId}` : '-')
      },
      {
        label: this.i18n.instant('INLINE_TEXT.PROPERTY_NAME'),
        value: this.maintenancePropertyName(c)
      },
      {
        label: this.i18n.instant('INLINE_TEXT.VACANT_UNITS_2'),
        value: String(c.propertyVacantUnits ?? 0)
      },
      {
        label: this.i18n.instant('INLINE_TEXT.NON_VACANT_UNITS_SO_FAR'),
        value: String(c.propertyNonVacantUnits ?? 0)
      }
    ];
  }

  private maintenanceTerminationDialogTitle(decision: 'APPROVED' | 'REJECTED'): string {
    const isAr = this.i18n.currentLang === 'ar';
    if (decision === 'APPROVED') {
      return this.i18n.instant('INLINE_TEXT.APPROVE_MAINTENANCE_CONTRACT_CANCELLATION');
    }
    return this.i18n.instant('INLINE_TEXT.REJECT_MAINTENANCE_CONTRACT_CANCELLATION');
  }

  private maintenanceTerminationDialogSubtitle(c: MaintenanceContractResponse, decision: 'APPROVED' | 'REJECTED'): string {
    const isAr = this.i18n.currentLang === 'ar';
    const company = this.maintenanceCompanyLabel(c);
    const property = this.maintenancePropertyName(c);
    if (decision === 'APPROVED') {
      return isAr
        ? `سيتم إلغاء عقد الصيانة مع ${company} للعقار ${property}.`
        : `This will cancel the maintenance contract with ${company} for ${property}.`;
    }
    return isAr
      ? `سيظل عقد الصيانة مع ${company} مستمرا للعقار ${property}.`
      : `The maintenance contract with ${company} will remain active for ${property}.`;
  }

  private maintenanceTerminationImpact(c: MaintenanceContractResponse): string {
    const isAr = this.i18n.currentLang === 'ar';
    if (c.propertyWillBeWithoutMaintenanceAfterTermination) {
      return this.i18n.instant('INLINE_TEXT.WARNING_APPROVING_THIS_TERMINATION_WILL_LEAVE_THIS_PROP');
    }
    const count = c.otherActiveMaintenanceContractsForProperty ?? 0;
    return isAr
      ? `بعد الموافقة سيظل للعقار ${count} عقد صيانة نشط آخر.`
      : `After approval, the property will still have ${count} other active maintenance contract(s).`;
  }

  private maintenanceRenewalImpact(c: MaintenanceContractResponse): string {
    const isAr = this.i18n.currentLang === 'ar';
    return isAr
      ? `الموافقة ستنشئ عقد صيانة نشط جديد لنفس العقار مع شركة ${this.maintenanceCompanyLabel(c)}.`
      : `Approval will create a new active maintenance contract for this property with ${this.maintenanceCompanyLabel(c)}.`;
  }

  private maintenanceCompanyLabel(c: MaintenanceContractResponse): string {
    return this.i18n.currentLang === 'ar'
      ? (c.contractorCompanyNameAr || c.contractorCompanyNameEn || c.contractorCompanyName || '-')
      : (c.contractorCompanyNameEn || c.contractorCompanyNameAr || c.contractorCompanyName || '-');
  }

  private maintenancePropertyLabel(c: MaintenanceContractResponse): string {
    const name = this.maintenancePropertyName(c);
    const code = c.propertyCode || `#${c.propertyId}`;
    return name ? `${name} (${code})` : code;
  }

  maintenancePropertyName(c: MaintenanceContractResponse): string {
    return this.i18n.currentLang === 'ar'
      ? (c.propertyNameAr || c.propertyNameEn || c.propertyName || '-')
      : (c.propertyNameEn || c.propertyNameAr || c.propertyName || '-');
  }

  maintenancePropertyCode(c: MaintenanceContractResponse): string {
    return c.propertyCode || (c.propertyId != null ? `#${c.propertyId}` : '-');
  }

  private contractDurationLabel(c: MaintenanceContractResponse): string {
    const isAr = this.i18n.currentLang === 'ar';
    const total = this.daysBetween(c.startDate, c.endDate);
    if (total == null) return this.i18n.instant('INLINE_TEXT.OPEN_ENDED');
    return isAr ? `${total} يوم` : `${total} days`;
  }

  private contractProgressLabel(c: MaintenanceContractResponse): string {
    const isAr = this.i18n.currentLang === 'ar';
    const total = this.daysBetween(c.startDate, c.endDate);
    if (total == null || total <= 0) return this.i18n.instant('INLINE_TEXT.NOT_AVAILABLE');
    const elapsed = Math.max(0, Math.min(total, this.daysBetween(c.startDate, new Date()) ?? 0));
    const pct = Math.round((elapsed / total) * 100);
    return isAr ? `${elapsed} من ${total} يوم (${pct}%)` : `${elapsed} of ${total} days (${pct}%)`;
  }

  private daysBetween(start: string | Date | null | undefined, end: string | Date | null | undefined): number | null {
    if (!start || !end) return null;
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
  }

  private formatDate(value: string | null | undefined): string {
    return this.i18n.formatDateTime(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatDateTime(value: string | null | undefined): string {
    return this.i18n.formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' });
  }

  private formatNumber(value: number): string {
    return this.i18n.formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
