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
import { MaintenanceInvoiceService, MaintenanceInvoice } from '../../../core/services/maintenance-invoice.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ReviewDialogComponent, ReviewDialogData } from '../review-dialog/review-dialog.component';

@Component({
  selector: 'app-maintenance-invoices',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DatePipe, DecimalPipe, ReactiveFormsModule,
    TranslateModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule,
    MatDialogModule, MatTooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './maintenance-invoices.component.html',
  styleUrl: './maintenance-invoices.component.scss'
})
export class MaintenanceInvoicesComponent implements OnInit {
  invoices: MaintenanceInvoice[] = [];
  loading = true;
  filterForm: FormGroup;

  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly currentYear = new Date().getFullYear();
  readonly years = Array.from({ length: 3 }, (_, i) => this.currentYear - i);

  constructor(
    private readonly fb: FormBuilder,
    private readonly svc: MaintenanceInvoiceService,
    private readonly snack: SnackService,
    private readonly dialog: MatDialog,
    readonly i18n: I18nService
  ) {
    this.filterForm = this.fb.group({ year: [null], month: [null] });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const { year, month } = this.filterForm.value;
    this.svc.getAllInvoices(year ?? undefined, month ?? undefined).subscribe({
      next: res => { this.invoices = res.data ?? []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openReview(inv: MaintenanceInvoice): void {
    const data: ReviewDialogData = {
      title: this.i18n.instant('MAINTENANCE_INVOICES.REVIEW_INVOICE'),
      currentStatus: inv.status
    };
    const ref = this.dialog.open(ReviewDialogComponent, { width: '420px', data });
    ref.afterClosed().subscribe((result: { status: string; notes: string } | undefined) => {
      if (!result) return;
      this.svc.reviewInvoice(inv.id, result.status, result.notes).subscribe({
        next: () => { this.snack.success(this.i18n.instant('COMMON.SAVED')); this.load(); },
        error: (e) => this.snack.error(e?.error?.message || this.i18n.instant('COMMON.ERROR'))
      });
    });
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

  viewFile(url: string): void { window.open(url, '_blank'); }
}
