import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContractService } from '../../../core/services/contract.service';
import { ContractRenewalContext, LeaseContract } from '../../../core/models/contract.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-contract-renewal-form',
  standalone: true,
  imports: [
    NgIf, NgFor, DecimalPipe, DatePipe, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatDividerModule,
    TranslateModule, PageHeaderComponent
  ],
  templateUrl: './contract-renewal-form.component.html',
  styleUrl: './contract-renewal-form.component.scss'
})
export class ContractRenewalFormComponent implements OnInit {
  loading = true;
  saving = false;
  errorMsg = '';
  contractId!: number;
  ctx: ContractRenewalContext | null = null;
  tenantDisplayName = '';
  form!: FormGroup;
  rentIncreasePercent = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private contractSvc: ContractService,
    private tenantSvc: TenantService,
    private location: Location,
    private dialog: MatDialog,
    readonly i18n: I18nService
  ) {}

  get contract(): LeaseContract | null {
    return this.ctx?.contract ?? null;
  }

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.contractId = Number(this.route.snapshot.paramMap.get('id'));
    this.form = this.fb.group({
      newStartDate: [null, Validators.required],
      newEndDate: [null, Validators.required],
      newMonthlyRent: [null, [Validators.required, Validators.min(1)]],
      notes: ['']
    });

    this.contractSvc.getRenewalContext(this.contractId).pipe(catchError(() => of(null))).subscribe(res => {
      this.ctx = res?.data ?? null;
      if (this.contract) {
        this.form.patchValue({
          newMonthlyRent: this.contract.monthlyRent
        });
        this.loadTenantDisplayName(this.contract.tenantId, this.contract.tenantName);
      }
      this.loading = false;
    });

    this.form.get('newMonthlyRent')?.valueChanges.subscribe(val => {
      if (this.contract?.monthlyRent && val != null) {
        this.rentIncreasePercent = ((val - this.contract.monthlyRent) / this.contract.monthlyRent) * 100;
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'app-dialog-panel',
      data: {
        title: this.i18n.instant('INLINE_TEXT.CONFIRM_RENEWAL_REQUEST'),
        message: this.i18n.instant('INLINE_TEXT.ARE_YOU_SURE_YOU_WANT_TO_SAVE_AND_SUBMIT_THIS_RENEWAL_R'),
        confirmLabel: this.i18n.instant('INLINE_TEXT.OK'),
        cancelLabel: this.i18n.instant('INLINE_TEXT.CANCEL'),
        icon: 'warning'
      } as ConfirmDialogData
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      const proposedStartDate = this.toIsoDate(this.form.value.newStartDate);
      const proposedEndDate = this.toIsoDate(this.form.value.newEndDate);
      if (!proposedStartDate || !proposedEndDate) return;
      this.saving = true;
      const body = {
        proposedStartDate,
        proposedEndDate,
        proposedRentAmount: Number(this.form.value.newMonthlyRent),
        note: this.form.value.notes ?? ''
      };
      this.contractSvc.requestRenewal(this.contractId, body).subscribe({
        next: () => {
          this.router.navigate(['/admin/contracts', this.contractId]);
        },
        error: (err) => {
          this.errorMsg = err?.error?.message ?? 'CONTRACT.RENEWAL.DIALOG.ERROR_SUBMIT';
          this.saving = false;
        }
      });
    });
  }

  private toIsoDate(d: Date | null): string | null {
    if (!d) return null;
    return new Date(d).toISOString().split('T')[0];
  }

  cancel(): void {
    this.router.navigate(['/admin/contracts', this.contractId]);
  }

  private loadTenantDisplayName(tenantId?: number | null, fallbackName?: string | null): void {
    const fallback = (fallbackName ?? '').trim();
    this.tenantDisplayName = fallback;
    if (!tenantId) return;
    this.tenantSvc.getById(tenantId).pipe(catchError(() => of(null))).subscribe((res) => {
      const tenant = res?.data;
      const ar = tenant?.fullNameAr?.trim();
      const en = tenant?.fullNameEn?.trim();
      const full = tenant?.fullName?.trim();
      this.tenantDisplayName = this.i18n.currentLang === 'ar'
        ? (ar || full || en || fallback || '-')
        : (en || full || ar || fallback || '-');
    });
  }

  unitTypeLabel(code?: string | null): string {
    if (!code) return '—';
    const key = `UNITS.UNIT_TYPES.${code}`;
    const translated = this.i18n.instant(key);
    return translated && translated !== key ? translated : code;
  }

  furnishedLabel(status?: string | null): string {
    if (!status) return '—';
    const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const key = `UNIT_DETAILS.${normalized}`;
    const translated = this.i18n.instant(key);
    return translated && translated !== key ? translated : status;
  }
}
