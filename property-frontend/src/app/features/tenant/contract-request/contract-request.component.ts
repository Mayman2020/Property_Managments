import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
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
import { TenantPortalService, ContractActionRequest } from '../../../core/services/tenant-portal.service';
import { ApiService } from '../../../core/services/api.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-contract-request',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, ReactiveFormsModule, RouterLink,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './contract-request.component.html',
  styleUrl: './contract-request.component.scss'
})
export class ContractRequestComponent implements OnInit {
  activeTab: 'RENEWAL' | 'TERMINATION' = 'RENEWAL';
  submitting = false;
  loadingHistory = true;
  history: ContractActionRequest[] = [];

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

    this.loadHistory();
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
    if (form.invalid || this.submitting) {
      form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      if (this.attachmentFile && !this.attachmentUrl) {
        const res = await firstValueFrom(this.apiSvc.uploadFile(this.attachmentFile.file));
        this.attachmentUrl = res?.url ?? null;
      }

      const contractRes = await firstValueFrom(this.portalSvc.getMyContract());
      const contractId = contractRes.data?.id;
      if (!contractId) throw new Error('No active contract');

      const { requestedDate, notes, reason } = form.value;
      await firstValueFrom(this.portalSvc.createContractRequest({
        contractId,
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
      this.loadHistory();
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

  private toYmd(value: Date | string): string {
    if (typeof value === 'string') return value;
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
}
