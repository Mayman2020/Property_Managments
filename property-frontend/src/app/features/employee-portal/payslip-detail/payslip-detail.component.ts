import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { HrService, PayslipItem } from '../../../core/services/hr.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payslip-detail',
  standalone: true,
  imports: [
    NgIf, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <div class="payslip-page" [class.print-mode]="isPrintMode">
      <!-- Toolbar (hidden in print) -->
      <div class="no-print toolbar">
        <button mat-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          {{ ('INLINE_TEXT.BACK' | translate) }}
        </button>
        <button mat-raised-button color="primary" (click)="print()">
          <mat-icon>print</mat-icon>
          {{ ('INLINE_TEXT.PRINT' | translate) }}
        </button>
      </div>

      <div *ngIf="loading" class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && slip" class="slip-container">
        <!-- Header -->
        <div class="slip-header">
          <div class="company-info">
            <h2>{{ ('INLINE_TEXT.PAY_SLIP' | translate) }}</h2>
          </div>
          <div class="status-badge" [class.paid]="slip.paid">
            {{ slip.paid
              ? (('INLINE_TEXT.PAID_2' | translate))
              : (('INLINE_TEXT.PENDING' | translate)) }}
          </div>
        </div>

        <!-- Employee Info -->
        <div class="info-section">
          <div class="info-row">
            <span class="label">{{ ('INLINE_TEXT.EMPLOYEE_NAME' | translate) }}</span>
            <span class="value">{{ slip.employeeName ?? '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ ('INLINE_TEXT.EMPLOYEE_CODE' | translate) }}</span>
            <span class="value">{{ slip.employeeCode ?? '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ ('INLINE_TEXT.JOB_TITLE' | translate) }}</span>
            <span class="value">{{ slip.jobTitle ?? '-' }}</span>
          </div>
          <div class="info-row" *ngIf="slip.paidDate">
            <span class="label">{{ ('INLINE_TEXT.PAYMENT_DATE' | translate) }}</span>
            <span class="value">{{ slip.paidDate | date:'dd MMMM yyyy' }}</span>
          </div>
          <div class="info-row" *ngIf="slip.paymentMethod">
            <span class="label">{{ ('INLINE_TEXT.PAYMENT_METHOD' | translate) }}</span>
            <span class="value">{{ slip.paymentMethod }}</span>
          </div>
          <div class="info-row" *ngIf="slip.referenceNumber">
            <span class="label">{{ ('INLINE_TEXT.REFERENCE' | translate) }}</span>
            <span class="value">{{ slip.referenceNumber }}</span>
          </div>
        </div>

        <!-- Earnings -->
        <div class="section-title">{{ ('INLINE_TEXT.EARNINGS' | translate) }}</div>
        <table class="breakdown-table">
          <tr>
            <td>{{ ('INLINE_TEXT.BASIC_SALARY' | translate) }}</td>
            <td class="amount">{{ slip.basicSalary | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.housingAllowance ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.HOUSING_ALLOWANCE' | translate) }}</td>
            <td class="amount">{{ slip.housingAllowance | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.transportAllowance ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.TRANSPORT_ALLOWANCE' | translate) }}</td>
            <td class="amount">{{ slip.transportAllowance | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.otherAllowances ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.OTHER_ALLOWANCES' | translate) }}</td>
            <td class="amount">{{ slip.otherAllowances | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.overtimeAmount ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.OVERTIME' | translate) }}</td>
            <td class="amount">{{ slip.overtimeAmount | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.bonusAmount ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.BONUSES' | translate) }}</td>
            <td class="amount bonus">{{ slip.bonusAmount | number:'1.2-2' }}</td>
          </tr>
          <tr class="subtotal">
            <td>{{ ('INLINE_TEXT.TOTAL_EARNINGS' | translate) }}</td>
            <td class="amount">{{ slip.totalEarnings | number:'1.2-2' }}</td>
          </tr>
        </table>

        <!-- Deductions -->
        <div class="section-title" *ngIf="(slip.totalDeductions ?? 0) > 0">{{ ('INLINE_TEXT.DEDUCTIONS' | translate) }}</div>
        <table class="breakdown-table" *ngIf="(slip.totalDeductions ?? 0) > 0">
          <tr *ngIf="(slip.absenceDeduction ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.ABSENCE_DEDUCTION' | translate) }}</td>
            <td class="amount deduction">{{ slip.absenceDeduction | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.lateDeduction ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.LATE_DEDUCTION' | translate) }}</td>
            <td class="amount deduction">{{ slip.lateDeduction | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.advanceDeduction ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.ADVANCE_DEDUCTION' | translate) }}</td>
            <td class="amount deduction">{{ slip.advanceDeduction | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.penaltyDeduction ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.PENALTIES' | translate) }}</td>
            <td class="amount deduction">{{ slip.penaltyDeduction | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.insuranceDeduction ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.INSURANCE' | translate) }}</td>
            <td class="amount deduction">{{ slip.insuranceDeduction | number:'1.2-2' }}</td>
          </tr>
          <tr *ngIf="(slip.otherDeductions ?? 0) > 0">
            <td>{{ ('INLINE_TEXT.OTHER_DEDUCTIONS' | translate) }}</td>
            <td class="amount deduction">{{ slip.otherDeductions | number:'1.2-2' }}</td>
          </tr>
          <tr class="subtotal">
            <td>{{ ('INLINE_TEXT.TOTAL_DEDUCTIONS' | translate) }}</td>
            <td class="amount deduction">{{ slip.totalDeductions | number:'1.2-2' }}</td>
          </tr>
        </table>

        <!-- Net Salary -->
        <div class="net-box">
          <span>{{ ('INLINE_TEXT.NET_SALARY' | translate) }}</span>
          <span class="net-value">{{ slip.netSalary | number:'1.2-2' }}</span>
        </div>

        <!-- Footer note -->
        <div class="print-footer">
          <p>{{ ('INLINE_TEXT.THIS_DOCUMENT_IS_ELECTRONICALLY_GENERATED_AND_DOES_NOT_' | translate) }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payslip-page { max-width: 700px; margin: 0 auto; padding: 16px; font-family: 'Segoe UI', Arial, sans-serif; }

    .toolbar { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .loading-center { display: flex; justify-content: center; padding: 60px 0; }

    .slip-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .slip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      background: #1a1a2e;
      color: #fff;
    }
    .slip-header h2 { margin: 0; font-size: 20px; }

    .status-badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      background: #374151;
      color: #fff;
    }
    .status-badge.paid { background: #22c55e; }

    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      padding: 16px 24px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row { display: flex; flex-direction: column; padding: 6px 0; }
    .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 14px; color: #111827; font-weight: 500; margin-top: 2px; }

    .section-title {
      padding: 12px 24px 4px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.8px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .breakdown-table { width: 100%; border-collapse: collapse; }
    .breakdown-table td { padding: 10px 24px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .breakdown-table td:first-child { color: #374151; }
    .breakdown-table .amount { text-align: end; font-weight: 500; color: #111827; }
    .breakdown-table .amount.deduction { color: #ef4444; }
    .breakdown-table .amount.bonus { color: #22c55e; }
    .breakdown-table .subtotal td { background: #f9fafb; font-weight: 600; border-top: 2px solid #e5e7eb; }

    .net-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: #1a1a2e;
      color: #fff;
    }
    .net-box span:first-child { font-size: 15px; opacity: 0.8; }
    .net-value { font-size: 28px; font-weight: 700; }

    .print-footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; }

    @media print {
      .no-print { display: none !important; }
      .slip-container { border: none; box-shadow: none; }
      .payslip-page { padding: 0; }
      .slip-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .net-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `]
})
export class PayslipDetailComponent implements OnInit {
  slip: PayslipItem | null = null;
  loading = true;
  isPrintMode = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly hrService: HrService,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.isPrintMode = this.route.snapshot.queryParamMap.get('print') === '1';

    this.hrService.getMyPayslipById(id).subscribe({
      next: (res) => {
        this.slip = res.data ?? null;
        this.loading = false;
        if (this.isPrintMode) {
          setTimeout(() => window.print(), 500);
        }
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('INLINE_TEXT.FAILED_TO_LOAD_PAYSLIP'));
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/employee/my-payslips']);
  }

  print(): void {
    window.print();
  }
}
