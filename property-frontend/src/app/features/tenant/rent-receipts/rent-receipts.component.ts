import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { TenantPortalService, RentReceipt } from '../../../core/services/tenant-portal.service';
import { ApiService } from '../../../core/services/api.service';import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-rent-receipts',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent
  ],
  templateUrl: './rent-receipts.component.html',
  styleUrl: './rent-receipts.component.scss'
})
export class RentReceiptsComponent implements OnInit {
  receipts: RentReceipt[] = [];
  loading = true;
  submitting = false;
  showForm = false;

  form: FormGroup;
  uploadedFile: UploadedFile | null = null;
  uploadedUrl: string | null = null;

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 5 }, (_, i) => this.currentYear - i);

  constructor(
    private readonly fb: FormBuilder,
    private readonly portalSvc: TenantPortalService,
    private readonly apiSvc: ApiService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.form = this.fb.group({
      periodMonth: [new Date().getMonth() + 1, Validators.required],
      periodYear: [this.currentYear, Validators.required],
      amount: [null],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.loading = true;
    this.portalSvc.getMyReceipts().subscribe({
      next: res => { this.receipts = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
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
      await firstValueFrom(this.portalSvc.uploadReceipt({ periodMonth, periodYear, amount: amount || undefined, fileUrl: this.uploadedUrl!, notes: notes || undefined }));

      this.snack.success(this.i18n.instant('TENANT_PORTAL.RECEIPT_UPLOADED'));
      this.showForm = false;
      this.uploadedFile = null;
      this.uploadedUrl = null;
      this.form.reset({ periodMonth: new Date().getMonth() + 1, periodYear: this.currentYear, amount: null, notes: '' });
      this.loadReceipts();
    } catch (err: any) {
      this.snack.error(err?.message || this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.submitting = false;
    }
  }

  monthLabel(m: number): string {
    const names: Record<string, string[]> = {
      ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
      en: ['January','February','March','April','May','June','July','August','September','October','November','December']
    };
    const lang = this.i18n.currentLang === 'ar' ? 'ar' : 'en';
    return names[lang][m - 1];
  }

  statusClass(s: string): string {
    return s === 'APPROVED' ? 'COMPLETED' : s === 'REJECTED' ? 'CANCELLED' : 'PENDING';
  }
}
