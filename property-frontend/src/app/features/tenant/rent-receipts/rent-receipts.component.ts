import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { TenantPortalService, RentReceipt } from '../../../core/services/tenant-portal.service';
import { ApiService } from '../../../core/services/api.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { LookupItem } from '../../../core/services/lookup.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rent-receipts',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './rent-receipts.component.html',
  styleUrl: './rent-receipts.component.scss'
})
export class RentReceiptsComponent implements OnInit, OnDestroy {
  receipts: RentReceipt[] = [];
  /** When set via ?contractId=, list only receipts linked to that contract. */
  filterContractId: number | null = null;
  private qpSub?: Subscription;
  loading = true;
  submitting = false;
  showForm = false;

  form: FormGroup;
  uploadedFile: UploadedFile | null = null;
  uploadedUrl: string | null = null;

  monthOptions: LookupItem[] = [];
  yearOptions: LookupItem[] = [];
  readonly currentYear = new Date().getFullYear();

  constructor(
    private readonly fb: FormBuilder,
    private readonly portalSvc: TenantPortalService,
    private readonly apiSvc: ApiService,
    private readonly lookupCache: LookupCacheService,
    private readonly snack: SnackService,
    private readonly route: ActivatedRoute,
    readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      periodMonth: [String(new Date().getMonth() + 1), Validators.required],
      periodYear: [String(this.currentYear), Validators.required],
      amount: [null],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.subscribe((pm) => {
      const raw = pm.get('contractId');
      if (raw == null || raw === '') {
        this.filterContractId = null;
        return;
      }
      const n = Number(raw);
      this.filterContractId = Number.isFinite(n) ? n : null;
    });
    this.loadPeriodLookups();
    this.loadReceipts();
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

  get filteredReceipts(): RentReceipt[] {
    if (this.filterContractId == null) {
      return this.receipts;
    }
    return this.receipts.filter((r) => r.contractId === this.filterContractId);
  }

  loadReceipts(): void {
    this.loading = true;
    this.portalSvc.getMyReceipts().subscribe({
      next: res => { this.receipts = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  private loadPeriodLookups(): void {
    this.lookupCache.preload('MONTH', 'YEAR').subscribe({
      next: () => {
        const monthItems = this.lookupCache.items('MONTH');
        const yearItems = this.lookupCache.items('YEAR');
        this.monthOptions = monthItems.length ? monthItems : this.fallbackMonthOptions();
        this.yearOptions = yearItems.length ? yearItems : this.fallbackYearOptions();
      },
      error: () => {
        this.monthOptions = this.fallbackMonthOptions();
        this.yearOptions = this.fallbackYearOptions();
      }
    });
  }

  private fallbackMonthOptions(): LookupItem[] {
    const namesAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const namesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return namesEn.map((nameEn, index) => ({
      id: index + 1,
      type: 'MONTH',
      code: String(index + 1),
      nameAr: namesAr[index],
      nameEn,
      sortOrder: index,
      active: true,
      locked: false
    }));
  }

  private fallbackYearOptions(): LookupItem[] {
    return Array.from({ length: 5 }, (_, i) => {
      const year = this.currentYear - i;
      return {
        id: year,
        type: 'YEAR',
        code: String(year),
        nameAr: String(year),
        nameEn: String(year),
        sortOrder: i,
        active: true,
        locked: false
      };
    });
  }

  onFilesChange(files: UploadedFile[]): void {
    this.uploadedFile = files[0] ?? null;
    this.uploadedUrl = null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.uploadedFile) {
      this.snack.error(this.i18n.instant('TENANT_PORTAL.RECEIPT_FILE_REQUIRED'));
      return;
    }

    this.submitting = true;

    try {
      if (!this.uploadedUrl) {
        const uploadRes = await firstValueFrom(this.apiSvc.uploadFile(this.uploadedFile.file));
        this.uploadedUrl = uploadRes?.url;
      }

      const { periodMonth, periodYear, amount, notes } = this.form.value;
      const monthNumber = Number(periodMonth);
      const yearNumber = Number(periodYear);
      await firstValueFrom(this.portalSvc.uploadReceipt({ periodMonth: monthNumber, periodYear: yearNumber, amount: amount || undefined, fileUrl: this.uploadedUrl!, notes: notes || undefined }));

      this.snack.success(this.i18n.instant('TENANT_PORTAL.RECEIPT_UPLOADED'));
      this.showForm = false;
      this.uploadedFile = null;
      this.uploadedUrl = null;
      this.form.reset({ periodMonth: String(new Date().getMonth() + 1), periodYear: String(this.currentYear), amount: null, notes: '' });
      this.loadReceipts();
    } catch (err: any) {
      this.snack.error(err?.message || this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.submitting = false;
    }
  }

  monthLabel(value: number | string): string {
    const code = String(value);
    const label = this.lookupCache.label('MONTH', code);
    if (label && label !== code) {
      return label;
    }

    const names: Record<string, string[]> = {
      ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
      en: ['January','February','March','April','May','June','July','August','September','October','November','December']
    };
    const lang = this.i18n.currentLang === 'ar' ? 'ar' : 'en';
    const index = Number(code) - 1;
    return names[lang][index] ?? code;
  }

  yearLabel(value: number | string): string {
    const code = String(value);
    const label = this.lookupCache.label('YEAR', code);
    return label || code;
  }

  statusClass(s: string): string {
    return s === 'APPROVED' ? 'COMPLETED' : s === 'REJECTED' ? 'CANCELLED' : 'PENDING';
  }

  receiptSourceLabel(r: RentReceipt): string {
    if (r.uploadSource === 'STAFF') {
      return this.i18n.instant('TENANT_PORTAL.RECEIPT_SOURCE_STAFF');
    }
    return this.i18n.instant('TENANT_PORTAL.RECEIPT_SOURCE_TENANT');
  }
}
