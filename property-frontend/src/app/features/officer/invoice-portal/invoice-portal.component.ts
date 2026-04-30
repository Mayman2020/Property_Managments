import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UploadZoneComponent, UploadedFile } from '../../../shared/components/upload-zone/upload-zone.component';
import { MaintenanceInvoiceService, MaintenanceInvoice, CompanyProperty } from '../../../core/services/maintenance-invoice.service';
import { ApiService } from '../../../core/services/api.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-invoice-portal',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule,
    PageHeaderComponent, UploadZoneComponent, MatTooltipModule
  ],
  templateUrl: './invoice-portal.component.html',
  styleUrl: './invoice-portal.component.scss'
})
export class InvoicePortalComponent implements OnInit {
  invoices: MaintenanceInvoice[] = [];
  properties: CompanyProperty[] = [];
  loading = true;
  submitting = false;
  showForm = false;

  form: FormGroup;
  uploadedFile: UploadedFile | null = null;
  uploadedUrl: string | null = null;

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 3 }, (_, i) => this.currentYear - i);

  constructor(
    private readonly fb: FormBuilder,
    private readonly svc: MaintenanceInvoiceService,
    private readonly apiSvc: ApiService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    readonly auth: AuthService
  ) {
    this.form = this.fb.group({
      periodMonth: [new Date().getMonth() + 1, Validators.required],
      periodYear: [this.currentYear, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      propertyId: [null],
      unitId: [null],
      description: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadProperties();
    this.loadInvoices();
  }

  loadProperties(): void {
    this.svc.getMyProperties().subscribe({
      next: res => this.properties = res.data ?? []
    });
  }

  loadInvoices(): void {
    this.loading = true;
    this.svc.getMyInvoices().subscribe({
      next: res => { this.invoices = res.data ?? []; this.loading = false; },
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
    if (!this.uploadedFile && !this.uploadedUrl) {
      this.snack.error(this.i18n.instant('INVOICE_PORTAL.FILE_REQUIRED'));
      return;
    }

    this.submitting = true;
    try {
      if (this.uploadedFile && !this.uploadedUrl) {
        const uploadRes = await firstValueFrom(this.apiSvc.uploadFile(this.uploadedFile.file));
        this.uploadedUrl = uploadRes?.url;
      }

      const { periodMonth, periodYear, amount, propertyId, unitId, description, notes } = this.form.value;
      await firstValueFrom(this.svc.submitInvoice({
        periodMonth, periodYear,
        amount: parseFloat(amount),
        propertyId: propertyId || undefined,
        unitId: unitId || undefined,
        description: description || undefined,
        fileUrl: this.uploadedUrl!,
        notes: notes || undefined
      }));

      this.snack.success(this.i18n.instant('INVOICE_PORTAL.SUBMITTED'));
      this.showForm = false;
      this.uploadedFile = null;
      this.uploadedUrl = null;
      this.form.reset({ periodMonth: new Date().getMonth() + 1, periodYear: this.currentYear });
      this.loadInvoices();
    } catch (err: any) {
      this.snack.error(err?.error?.message || this.i18n.instant('COMMON.ERROR'));
    } finally {
      this.submitting = false;
    }
  }

  monthLabel(m: number): string {
    const names: Record<string, string[]> = {
      ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
      en: ['January','February','March','April','May','June','July','August','September','October','November','December']
    };
    return names[this.i18n.currentLang === 'ar' ? 'ar' : 'en'][m - 1];
  }

  statusClass(s: string): string {
    return s === 'APPROVED' ? 'approved' : s === 'REJECTED' ? 'rejected' : 'pending';
  }

  viewFile(url: string): void {
    window.open(url, '_blank');
  }
}
