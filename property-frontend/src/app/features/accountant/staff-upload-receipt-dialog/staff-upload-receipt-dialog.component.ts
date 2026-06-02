import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { ApiService } from '../../../core/services/api.service';
import { TenantPortalService } from '../../../core/services/tenant-portal.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-staff-upload-receipt-dialog',
  standalone: true,
  imports: [
    NgFor, NgIf, ReactiveFormsModule, TranslateModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, UploadZoneComponent, DialogTitleCloseDirective],
  templateUrl: './staff-upload-receipt-dialog.component.html',
  styleUrl: './staff-upload-receipt-dialog.component.scss'
})
export class StaffUploadReceiptDialogComponent {
  submitting = false;
  uploadedFile: UploadedFile | null = null;
  uploadedUrl: string | null = null;

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 5 }, (_, i) => this.currentYear - i);

  form = this.fb.group({
    tenantId: [null as number | null, [Validators.required, Validators.min(1)]],
    contractId: [null as number | null],
    periodMonth: [new Date().getMonth() + 1, Validators.required],
    periodYear: [this.currentYear, Validators.required],
    amount: [null as number | null],
    notes: ['']
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly ref: MatDialogRef<StaffUploadReceiptDialogComponent, boolean>,
    private readonly api: ApiService,
    private readonly portal: TenantPortalService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {}

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
        const up = await firstValueFrom(this.api.uploadFile(this.uploadedFile.file));
        this.uploadedUrl = up?.url || '';
      }
      if (!this.uploadedUrl) {
        this.snack.error(this.i18n.instant('COMMON.ERROR'));
        return;
      }

      const v = this.form.getRawValue();
      const periodMonth = Number(v.periodMonth);
      const periodYear = Number(v.periodYear);
      if (!Number.isFinite(periodMonth) || !Number.isFinite(periodYear)) {
        this.snack.error(this.i18n.instant('COMMON.FILL_REQUIRED_FIELDS'));
        return;
      }
      await firstValueFrom(
        this.portal.staffUploadReceiptForTenant({
          tenantId: Number(v.tenantId),
          contractId: v.contractId != null && v.contractId > 0 ? Number(v.contractId) : undefined,
          periodMonth,
          periodYear,
          amount: v.amount != null && v.amount > 0 ? v.amount : undefined,
          fileUrl: this.uploadedUrl,
          notes: v.notes?.trim() || undefined
        })
      );
      this.snack.success(this.i18n.instant('ACCOUNTANT_PORTAL.STAFF_UPLOAD_OK'));
      this.ref.close(true);
    } catch (e: any) {
      this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.submitting = false;
    }
  }
}
