import { DialogTitleCloseDirective } from './../../../shared/directives/dialog-title-close.directive';
import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { Optional, Inject } from '@angular/core';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaymentService } from '../../../core/services/payment.service';
import { ApiService } from '../../../core/services/api.service';
import { RecordPaymentRequest } from '../../../core/models/contract.model';
import { LookupItem, LookupService } from '../../../core/services/lookup.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-record-payment-form',
  standalone: true,
  imports: [
    NgIf, NgFor, NgTemplateOutlet, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatDialogModule,
    TranslateModule, PageHeaderComponent, DialogTitleCloseDirective],
  templateUrl: './record-payment-form.component.html',
  styleUrl: './record-payment-form.component.scss'
})
export class RecordPaymentFormComponent implements OnInit {
  saving = false;
  receiptUploading = false;
  errorMsg = '';
  form!: FormGroup;
  contractId: number | null = null;
  scheduleId: number | null = null;

  methods: LookupItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private paymentSvc: PaymentService,
    private api: ApiService,
    private lookups: LookupService,
    private i18n: I18nService,
    private location: Location,
    @Optional() private dialogRef: MatDialogRef<RecordPaymentFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: Record<string, unknown> | null
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.contractId = (this.data?.['contractId'] as number) || Number(this.route.snapshot.queryParamMap.get('contractId')) || null;
    this.scheduleId = (this.data?.['scheduleId'] as number) || Number(this.route.snapshot.queryParamMap.get('scheduleId')) || null;

    this.form = this.fb.group({
      contractId: [this.contractId, Validators.required],
      scheduleId: [this.scheduleId],
      tenantId: [(this.data?.['tenantId'] as number) ?? null],
      paymentDate: [null, Validators.required],
      amountPaid: [null, [Validators.required, Validators.min(0.01)]],
      amountDue: [null, Validators.required],
      paymentMethod: ['', Validators.required],
      lateFee: [0],
      discount: [0],
      notes: [''],
      receiptUrl: ['']
    });

    if (this.data?.['amountDue']) {
      this.form.patchValue({ amountDue: this.data['amountDue'], amountPaid: this.data['amountDue'] });
    }

    if (this.data?.['requireReceipt']) {
      this.form.get('receiptUrl')?.setValidators([Validators.required]);
      this.form.get('receiptUrl')?.updateValueAndValidity();
    }

    this.loadPaymentMethods();
  }

  get isDialog(): boolean {
    return !!this.dialogRef;
  }

  get requireReceipt(): boolean {
    return !!this.data?.['requireReceipt'];
  }

  get hideScheduleFields(): boolean {
    return !!this.data?.['hideScheduleFields'];
  }

  methodName(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  onReceiptFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.receiptUploading = true;
    this.errorMsg = '';
    this.api.uploadFile(file).subscribe({
      next: (res) => {
        this.form.patchValue({ receiptUrl: res.url || '' });
        this.receiptUploading = false;
        input.value = '';
      },
      error: () => {
        this.receiptUploading = false;
        this.errorMsg = this.i18n.instant('COMMON.UPLOAD_SOME_FAILED');
      }
    });
  }

  submit(): void {
    if (this.requireReceipt) {
      this.form.get('receiptUrl')?.markAsTouched();
    }
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const paymentDate = this.toIsoDate(v.paymentDate);
    if (!paymentDate) {
      this.saving = false;
      return;
    }
    const body: RecordPaymentRequest = {
      contractId: v.contractId,
      scheduleId: v.scheduleId || undefined,
      tenantId: v.tenantId || undefined,
      paymentDate,
      amountPaid: v.amountPaid,
      amountDue: v.amountDue,
      paymentMethod: v.paymentMethod,
      lateFee: v.lateFee,
      discount: v.discount,
      notes: v.notes || undefined,
      receiptUrl: v.receiptUrl || undefined
    };
    this.paymentSvc.recordPayment(body).subscribe({
      next: () => {
        if (this.isDialog) {
          this.dialogRef.close(true);
        } else if (this.contractId) {
          this.router.navigate(['/admin/contracts', this.contractId]);
        } else {
          this.router.navigate(['/admin/contracts/list']);
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMsg = err?.error?.message ?? this.i18n.instant('COMMON.ERROR');
        this.saving = false;
      }
    });
  }

  private toIsoDate(d: Date | null): string | null {
    if (!d) return null;
    return new Date(d).toISOString().split('T')[0];
  }

  cancel(): void {
    if (this.isDialog) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/admin/contracts/list']);
    }
  }

  private loadPaymentMethods(): void {
    this.lookups.getByType('PAYMENT_METHOD').subscribe({
      next: (res) => {
        this.methods = res.data ?? [];
        if (!this.form.get('paymentMethod')?.value && this.methods.length) {
          this.form.patchValue({ paymentMethod: this.methods[0].code });
        }
      },
      error: () => {
        this.methods = [];
        this.errorMsg = this.i18n.instant('LOOKUPS.LOAD_ERROR');
      }
    });
  }
}
