import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { SearchDropdownComponent, SearchDropdownItem } from '../../../shared/components/search-dropdown/search-dropdown.component';
import { TenantPortalService, ContractActionRequest } from '../../../core/services/tenant-portal.service';
import { ApiService } from '../../../core/services/api.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LeaseContract } from '../../../core/models/contract.model';

@Component({
  selector: 'app-contract-request',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule,
    PageHeaderComponent, UploadZoneComponent, SearchDropdownComponent
  ],
  templateUrl: './contract-request.component.html',
  styleUrl: './contract-request.component.scss'
})
export class ContractRequestComponent implements OnInit {
  activeTab: 'RENEWAL' | 'TERMINATION' = 'RENEWAL';
  submitting = false;
  loadingContracts = true;
  loadingHistory = true;
  history: ContractActionRequest[] = [];
  contracts: LeaseContract[] = [];
  selectedContractId: number | null = null;
  selectedUnitFilterId: number | null = null;
  contractSearchTerm = '';
  chooserOpen = false;
  requestDetailsOpen = false;

  renewalForm: FormGroup;
  terminationForm: FormGroup;

  attachmentFile: UploadedFile | null = null;
  attachmentUrl: string | null = null;

  readonly terminationReasons = [
    { value: 'TENANT_REQUEST', labelAr: 'طلب المستأجر', labelEn: 'Tenant Request' },
    { value: 'NON_PAYMENT',    labelAr: 'عدم السداد',   labelEn: 'Non-Payment' },
    { value: 'VIOLATION',      labelAr: 'مخالفة',        labelEn: 'Violation' },
    { value: 'OTHER',          labelAr: 'أخرى',          labelEn: 'Other' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly portalSvc: TenantPortalService,
    private readonly apiSvc: ApiService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.renewalForm = this.fb.group({
      requestedDate: [null],
      notes: ['']
    });
    this.terminationForm = this.fb.group({
      requestedDate: [null, Validators.required],
      reason: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    const action = this.route.snapshot.queryParamMap.get('action');
    if (action === 'TERMINATION') this.activeTab = 'TERMINATION';

    this.loadContracts();
    this.loadHistory();
  }

  loadContracts(): void {
    this.loadingContracts = true;
    this.portalSvc.getMyContracts().subscribe({
      next: (res) => {
        this.contracts = res.data ?? [];
        const queryContractId = Number(this.route.snapshot.queryParamMap.get('contractId'));
        const preferred = Number.isFinite(queryContractId)
          ? this.selectableContracts.find((c) => c.id === queryContractId) ?? null
          : null;
        this.selectedContractId = preferred?.id ?? null;
        this.selectedUnitFilterId = null;
        this.loadingContracts = false;
      },
      error: () => { this.loadingContracts = false; }
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    this.portalSvc.getMyContractRequests().subscribe({
      next: res => { this.history = res.data ?? []; this.loadingHistory = false; },
      error: () => { this.loadingHistory = false; }
    });
  }

  onAttachmentChange(files: UploadedFile[]): void {
    this.attachmentFile = files[0] ?? null;
    this.attachmentUrl = null;
  }

  async submit(): Promise<void> {
    const form = this.activeTab === 'RENEWAL' ? this.renewalForm : this.terminationForm;
    if (form.invalid || this.submitting || !this.selectedContractId) {
      form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      if (this.attachmentFile && !this.attachmentUrl) {
        const res = await firstValueFrom(this.apiSvc.uploadFile(this.attachmentFile.file));
        this.attachmentUrl = res?.url ?? null;
      }

      const { requestedDate, notes, reason } = form.value;
      await firstValueFrom(this.portalSvc.createContractRequest({
        contractId: this.selectedContractId,
        actionType: this.activeTab,
        requestedDate: requestedDate ? this.toYmd(requestedDate) : undefined,
        reason: reason || undefined,
        notes: notes || undefined,
        attachmentUrl: this.attachmentUrl || undefined
      }));

      this.snack.success(this.i18n.instant('TENANT_PORTAL.REQUEST_SUBMITTED'));
      form.reset();
      this.attachmentFile = null;
      this.attachmentUrl = null;
      this.requestDetailsOpen = false;
      this.loadHistory();
      this.loadContracts();
    } catch (err: any) {
      this.snack.error(err?.message || this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.submitting = false;
    }
  }

  reasonLabel(r: string): string {
    const found = this.terminationReasons.find(x => x.value === r);
    return found ? (this.i18n.currentLang === 'ar' ? found.labelAr : found.labelEn) : r;
  }

  statusClass(s: string): string {
    return s === 'APPROVED' ? 'COMPLETED' : s === 'REJECTED' ? 'CANCELLED' : s === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
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

  get contractDropdownItems(): SearchDropdownItem[] {
    return this.selectableContracts.map(c => ({
      label: c.contractNumber,
      subLabel: [c.propertyName, c.unitNumber ? (this.i18n.instant('INLINE_TEXT.UNIT_3')) + c.unitNumber : null]
        .filter(Boolean).join(' · '),
      badge: this.contractStatusLabel(c.status),
      badgeClass: 'st-' + c.status,
      data: c
    }));
  }

  onContractDropdownSelect(contract: LeaseContract | null): void {
    if (contract) {
      this.selectedContractId = contract.id;
    } else {
      this.selectedContractId = null;
      this.selectedUnitFilterId = null;
    }
  }

  get filteredHistory(): ContractActionRequest[] {
    if (this.selectedContractId) {
      return this.history.filter((request) => request.contractId === this.selectedContractId);
    }
    if (!this.selectedUnitFilterId) return this.history;
    const contractIds = new Set(this.filteredContracts.map((contract) => contract.id));
    return this.history.filter((request) => contractIds.has(request.contractId));
  }

  selectContract(contract: LeaseContract): void {
    this.selectedContractId = contract.id;
  }

  selectUnitFilter(unitId: number | null): void {
    this.selectedUnitFilterId = unitId;
    const candidates = this.filteredContracts;
    if (unitId && !candidates.some((contract) => contract.id === this.selectedContractId)) {
      this.selectedContractId = candidates[0]?.id ?? null;
    }
  }

  onContractSearch(value: string): void {
    this.contractSearchTerm = value;
  }

  openChooser(contract?: LeaseContract): void {
    if (contract) this.selectContract(contract);
    this.chooserOpen = true;
  }

  chooseAction(action: 'RENEWAL' | 'TERMINATION'): void {
    this.activeTab = action;
    this.chooserOpen = false;
    this.requestDetailsOpen = true;
    this.attachmentFile = null;
    this.attachmentUrl = null;
    this.renewalForm.reset();
    this.terminationForm.reset();
  }

  closeRequestDetails(): void {
    if (this.submitting) return;
    this.requestDetailsOpen = false;
    this.attachmentFile = null;
    this.attachmentUrl = null;
  }

  requestProgressLabel(req: ContractActionRequest): string {
    const ar = this.i18n.currentLang === 'ar';
    if (req.status === 'APPROVED') return this.i18n.instant('INLINE_TEXT.OWNER_APPROVED_AND_THE_REQUEST_WAS_APPLIED');
    if (req.status === 'REJECTED') return this.i18n.instant('INLINE_TEXT.OWNER_REJECTED_THE_REQUEST');
    if (req.status === 'CANCELLED') return this.i18n.instant('INLINE_TEXT.REQUEST_CANCELLED');
    return this.i18n.instant('INLINE_TEXT.WAITING_FOR_OWNER_APPROVAL');
  }

  contractStatusLabel(status: string): string {
    return this.i18n.instant(`CONTRACTS.STATUS_${status}`);
  }

  private toYmd(value: Date | string): string {
    if (typeof value === 'string') return value;
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
}
