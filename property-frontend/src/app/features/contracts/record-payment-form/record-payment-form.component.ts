import { Component, OnInit } from '@angular/core';
import { Location, NgIf, NgFor } from '@angular/common';
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
import { PaymentMethod } from '../../../core/models/contract.model';

@Component({
  selector: 'app-record-payment-form',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatDialogModule,
    TranslateModule, PageHeaderComponent
  ],
  templateUrl: './record-payment-form.component.html',
  styleUrl: './record-payment-form.component.scss'
})
export class RecordPaymentFormComponent implements OnInit {
  saving = false;
  errorMsg = '';
  form!: FormGroup;
  contractId: number | null = null;
  scheduleId: number | null = null;

  methods: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CHECK', 'ONLINE', 'OTHER'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private paymentSvc: PaymentService,
    private location: Location,
    @Optional() private dialogRef: MatDialogRef<RecordPaymentFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.contractId = this.data?.contractId || Number(this.route.snapshot.queryParamMap.get('contractId')) || null;
    this.scheduleId = this.data?.scheduleId || Number(this.route.snapshot.queryParamMap.get('scheduleId')) || null;

    this.form = this.fb.group({
      contractId: [this.contractId, Validators.required],
      scheduleId: [this.scheduleId],
      paymentDate: [null, Validators.required],
      amountPaid: [null, [Validators.required, Validators.min(0.01)]],
      amountDue: [null, Validators.required],
      paymentMethod: ['CASH'],
      referenceNumber: [''],
      lateFee: [0],
      discount: [0],
      notes: ['']
    });

    if (this.data?.amountDue) {
      this.form.patchValue({ amountDue: this.data.amountDue, amountPaid: this.data.amountDue });
    }
  }

  get isDialog(): boolean {
    return !!this.dialogRef;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const body = {
      ...this.form.value,
      paymentDate: this.toIsoDate(this.form.value.paymentDate)
    };
    this.paymentSvc.recordPayment(body).subscribe({
      next: () => {
        if (this.isDialog) {
          this.dialogRef.close(true);
        } else if (this.contractId) {
          this.router.navigate(['/admin/contracts', this.contractId]);
        } else {
          this.router.navigate(['/admin/contracts/payments']);
        }
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message ?? 'Error recording payment';
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
      this.router.navigate(['/admin/contracts/payments']);
    }
  }
}
