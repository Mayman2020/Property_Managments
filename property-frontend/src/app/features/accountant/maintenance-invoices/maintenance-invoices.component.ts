import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { MaintenanceInvoiceService, MaintenanceInvoice, MaintenanceInvoiceFilterOption } from '../../../core/services/maintenance-invoice.service';
import { MaintenanceContractInvoiceService, MaintenanceContractInvoiceResponse } from '../../../core/services/maintenance-contract-invoice.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ReviewDialogComponent, ReviewDialogData } from '../review-dialog/review-dialog.component';
import {
  MaintenanceInvoicePaymentDialogComponent,
  MaintenanceInvoicePaymentDialogData,
  MaintenanceInvoicePaymentDialogResult
} from '../maintenance-invoice-payment-dialog/maintenance-invoice-payment-dialog.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-maintenance-invoices',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule,
    MatDialogModule, MatTooltipModule,
    PageHeaderComponent,
    TablePagerComponent,
    MaintenanceInvoicePaymentDialogComponent
  ],
  templateUrl: './maintenance-invoices.component.html',
  styleUrl: './maintenance-invoices.component.scss'
})
export class MaintenanceInvoicesComponent implements OnInit {
  invoices: MaintenanceInvoice[] = [];
  contractInvoices: MaintenanceContractInvoiceResponse[] = [];
  loading = true;
  activeTab: 'contractor' | 'contract' = 'contractor';
  readonly pageSize = 6;
  invoicePage = 0;
  contractPage = 0;

  get pagedInvoices(): MaintenanceInvoice[] {
    const start = this.invoicePage * this.pageSize;
    return this.invoices.slice(start, start + this.pageSize);
  }

  get pagedContractInvoices(): MaintenanceContractInvoiceResponse[] {
    const start = this.contractPage * this.pageSize;
    return this.contractInvoices.slice(start, start + this.pageSize);
  }
  filterForm: FormGroup;

  properties: MaintenanceInvoiceFilterOption[] = [];
  companies: MaintenanceInvoiceFilterOption[] = [];

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 3 }, (_, i) => this.currentYear - i);

  constructor(
    private readonly fb: FormBuilder,
    private readonly svc: MaintenanceInvoiceService,
    private readonly contractInvoiceSvc: MaintenanceContractInvoiceService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService,
    readonly permissions: PermissionService
  ) {
    this.filterForm = this.fb.group({ year: [null], month: [null], propertyId: [null], companyId: [null] });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.load();
  }

  onPropertyChange(propertyId: number | null): void {
    this.filterForm.patchValue({ companyId: null });
    this.companies = [];
    if (propertyId == null) return;
    this.svc.getFilterOptions(propertyId).subscribe({
      next: res => { this.companies = res.data?.companies ?? []; },
      error: () => { this.companies = []; }
    });
  }

  private loadFilterOptions(): void {
    this.svc.getFilterOptions().subscribe({
      next: res => { this.properties = res.data?.properties ?? []; },
      error: () => { this.properties = []; }
    });
  }

  propertyLabel(p: MaintenanceInvoiceFilterOption): string {
    return this.i18n.currentLang === 'ar'
      ? (p.nameAr || p.nameEn || p.name || String(p.id))
      : (p.nameEn || p.nameAr || p.name || String(p.id));
  }

  companyLabel(c: MaintenanceInvoiceFilterOption): string {
    return this.i18n.currentLang === 'ar'
      ? (c.nameAr || c.nameEn || c.name || String(c.id))
      : (c.nameEn || c.nameAr || c.name || String(c.id));
  }

  load(): void {
    this.loading = true;
    const { year, month, propertyId, companyId } = this.filterForm.value;
    forkJoin({
      contractor: this.svc.getAllInvoices(year ?? undefined, month ?? undefined, propertyId, companyId)
        .pipe(catchError(() => of({ data: [] as MaintenanceInvoice[] }))),
      contract: this.contractInvoiceSvc.listAll()
        .pipe(catchError(() => of({ data: [] as MaintenanceContractInvoiceResponse[] })))
    }).subscribe(({ contractor, contract }) => {
      this.invoices = contractor.data ?? [];
      let contractList: MaintenanceContractInvoiceResponse[] = contract.data ?? [];
      if (year) contractList = contractList.filter(i => i.invoiceYear === year);
      if (month) contractList = contractList.filter(i => i.invoiceMonth === month);
      if (propertyId) contractList = contractList.filter(i => i.propertyId === propertyId);
      if (companyId) contractList = contractList.filter(i => i.contractorCompanyId === companyId);
      this.contractInvoices = contractList;
      this.invoicePage = 0;
      this.contractPage = 0;
      this.loading = false;
    });
  }

  contractInvoiceStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'approved';
      case 'CANCELLED': return 'rejected';
      default: return 'pending';
    }
  }

  contractInvoiceStatusLabel(status: string): string {
    return this.i18n.instant(`MAINTENANCE_CONTRACT.STATUS_${status}`);
  }

  companyName(inv: MaintenanceContractInvoiceResponse): string {
    return this.i18n.currentLang === 'ar'
      ? (inv.contractorCompanyNameAr || inv.contractorCompanyName || inv.contractorCompanyNameEn || this.i18n.instant('COMMON.UNKNOWN'))
      : (inv.contractorCompanyNameEn || inv.contractorCompanyName || inv.contractorCompanyNameAr || this.i18n.instant('COMMON.UNKNOWN'));
  }

  invoiceDescription(inv: MaintenanceContractInvoiceResponse): string {
    const localized = this.i18n.currentLang === 'ar'
      ? (inv.descriptionAr || inv.descriptionEn)
      : (inv.descriptionEn || inv.descriptionAr);
    if (localized) return localized;
    return this.i18n.instant('MAINTENANCE_INVOICES.CONTRACT_INVOICE_DESCRIPTION', {
      invoiceNumber: inv.invoiceNumber
    });
  }

  displayNote(note: string | null | undefined): string {
    const value = (note ?? '').trim();
    if (!value) return '';
    if (value === 'Awaiting accountant payment confirmation' ||
        value === 'MAINTENANCE_INVOICES.AWAITING_ACCOUNTANT_PAYMENT_CONFIRMATION') {
      return this.i18n.instant('MAINTENANCE_INVOICES.AWAITING_ACCOUNTANT_PAYMENT_CONFIRMATION');
    }
    return value;
  }

  openReview(inv: MaintenanceInvoice): void {
    const data: ReviewDialogData = {
      title: this.i18n.instant('MAINTENANCE_INVOICES.REVIEW_INVOICE'),
      currentStatus: inv.status
    };
    const ref = this.dialog.open(ReviewDialogComponent, { width: '420px', data, disableClose: true });
    ref.afterClosed().subscribe((result: { status: string; notes: string } | undefined) => {
      if (!result) return;
      this.svc.reviewInvoice(inv.id, result.status, result.notes).subscribe({
        next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.load(); },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }

  monthLabel(month: number): string {
    if (month < 1 || month > 12) return String(month);
    return this.i18n.instant(`MONTHS.${month}`);
  }

  statusClass(status: string): string {
    return status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'pending';
  }

  viewFile(url: string): void { window.open(url, '_blank'); }

  canPayContractInvoice(inv: MaintenanceContractInvoiceResponse): boolean {
    return inv.status !== 'PAID' && inv.status !== 'CANCELLED';
  }

  hasPaymentPlan(inv: MaintenanceContractInvoiceResponse): boolean {
    return (inv.payments?.length || 0) > 0;
  }

  openContractInvoicePayment(inv: MaintenanceContractInvoiceResponse): void {
    const data: MaintenanceInvoicePaymentDialogData = { invoice: inv, currency: 'SAR' };
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
      this.contractInvoiceSvc.createPaymentPlan(inv.invoiceId, result.payload).subscribe({
        next: () => { this.snack.success(this.i18n.instant('MAINTENANCE_INVOICE_PAYMENT.PLAN_SAVED')); this.load(); },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }

  payContractInstallment(inv: MaintenanceContractInvoiceResponse, paymentId: number): void {
    const data: MaintenanceInvoicePaymentDialogData = {
      invoice: inv,
      currency: 'SAR',
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
      this.contractInvoiceSvc.markInstallmentPaid(inv.invoiceId, result.paymentId, result.payload).subscribe({
        next: () => { this.snack.success(this.i18n.instant('MAINTENANCE_INVOICE_PAYMENT.INSTALLMENT_SAVED')); this.load(); },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }
}

