import { Component, OnInit } from '@angular/core';
import { Location, NgIf, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContractService } from '../../../core/services/contract.service';
import { LeaseContract } from '../../../core/models/contract.model';

@Component({
  selector: 'app-contract-renewal-form',
  standalone: true,
  imports: [
    NgIf, DecimalPipe, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule,
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
  contract: LeaseContract | null = null;
  form!: FormGroup;
  rentIncreasePercent = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private contractSvc: ContractService,
    private location: Location
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.contractId = Number(this.route.snapshot.paramMap.get('id'));
    this.form = this.fb.group({
      newStartDate: [null, Validators.required],
      newEndDate: [null, Validators.required],
      newMonthlyRent: [null, [Validators.required, Validators.min(1)]],
      notes: ['']
    });

    this.contractSvc.getById(this.contractId).pipe(catchError(() => of(null))).subscribe(res => {
      this.contract = res?.data ?? null;
      if (this.contract) {
        this.form.patchValue({ newMonthlyRent: this.contract.monthlyRent });
      }
      this.loading = false;
    });

    this.form.get('newMonthlyRent')?.valueChanges.subscribe(val => {
      if (this.contract?.monthlyRent && val) {
        this.rentIncreasePercent = ((val - this.contract.monthlyRent) / this.contract.monthlyRent) * 100;
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const body = {
      ...this.form.value,
      newStartDate: this.toIsoDate(this.form.value.newStartDate),
      newEndDate: this.toIsoDate(this.form.value.newEndDate)
    };
    this.contractSvc.renew(this.contractId, body).subscribe({
      next: (res) => {
        this.router.navigate(['/admin/contracts', res.data?.id ?? this.contractId]);
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'Error renewing contract';
        this.saving = false;
      }
    });
  }

  private toIsoDate(d: Date | null): string | null {
    if (!d) return null;
    return new Date(d).toISOString().split('T')[0];
  }

  cancel(): void {
    this.router.navigate(['/admin/contracts', this.contractId]);
  }
}
