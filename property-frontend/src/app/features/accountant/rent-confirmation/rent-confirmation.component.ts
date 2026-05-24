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
import { PaymentService } from '../../../core/services/payment.service';
import { PropertyService, Property } from '../../../core/services/property.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ReviewDialogComponent, ReviewDialogData } from '../review-dialog/review-dialog.component';
import { StaffUploadReceiptDialogComponent } from '../staff-upload-receipt-dialog/staff-upload-receipt-dialog.component';
import { RentPaymentSchedule } from '../../../core/models/contract.model';

@Component({
  selector: 'app-rent-confirmation',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule,
    MatTooltipModule, PageHeaderComponent, TablePagerComponent
  ],
  templateUrl: './rent-confirmation.component.html',
  styleUrl: './rent-confirmation.component.scss'
})
export class RentConfirmationComponent implements OnInit {
  receipts: RentPaymentSchedule[] = [];
  properties: Property[] = [];
  loading = true;
  filterForm: FormGroup;
  readonly pageSize = 5;
  pageIndex = 0;

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 3 }, (_, i) => this.currentYear - i);

  constructor(
    private readonly fb: FormBuilder,
    private readonly svc: PaymentService,
    private readonly propertySvc: PropertyService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService,
    readonly permissions: PermissionService
  ) {
    this.filterForm = this.fb.group({
      year: [null],
      month: [null],
      propertyId: [null]
    });
  }

  ngOnInit(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.pageIndex = 0;
    });
    this.propertySvc.getAll(0, 500).subscribe({
      next: (res) => { this.properties = res.data?.content ?? []; },
      error: () => { this.properties = []; }
    });
    this.load();
  }

  get filteredReceipts(): RentPaymentSchedule[] {
    const { year, month, propertyId } = this.filterForm.value;
    return this.receipts.filter((receipt) => {
      if (year != null) {
        const dueYear = new Date(receipt.dueDate).getFullYear();
        if (dueYear !== Number(year)) return false;
      }
      if (month != null) {
        const dueMonth = new Date(receipt.dueDate).getMonth() + 1;
        if (dueMonth !== Number(month)) return false;
      }
      if (propertyId != null && receipt.propertyId != null) {
        if (receipt.propertyId !== Number(propertyId)) return false;
      }
      return true;
    });
  }

  get pagedReceipts(): RentPaymentSchedule[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredReceipts.slice(start, start + this.pageSize);
  }

  propertyLabel(p: Property): string {
    return this.i18n.currentLang === 'ar'
      ? (p.propertyNameAr || p.propertyName)
      : (p.propertyNameEn || p.propertyName);
  }

  load(): void {
    this.loading = true;
    this.svc.getPendingProofs().subscribe({
      next: res => { this.receipts = res.data ?? []; this.pageIndex = 0; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openReview(receipt: RentPaymentSchedule): void {
    const data: ReviewDialogData = {
      title: this.i18n.instant('ACCOUNTANT_PORTAL.REVIEW_RECEIPT'),
      currentStatus: receipt.status
    };
    const ref = this.dialog.open(ReviewDialogComponent, { width: '420px', data, disableClose: true });
    ref.afterClosed().subscribe((result: { status: string; notes: string } | undefined) => {
      if (!result) return;
      const status = result.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      this.svc.reviewProof(receipt.id, status, result.notes).subscribe({
        next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.load(); },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
  }

  monthLabel(m: number): string {
    if (m < 1 || m > 12) return String(m);
    return this.i18n.instant(`MONTHS.${m}`);
  }

  statusClass(s: string): string {
    return s === 'PAID' ? 'approved' : s === 'PAYMENT_REJECTED' ? 'rejected' : 'pending';
  }

  viewFile(url: string): void {
    window.open(url, '_blank');
  }

  openStaffUpload(): void {
    const ref = this.dialog.open(StaffUploadReceiptDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      disableClose: true
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.load();
    });
  }
}
