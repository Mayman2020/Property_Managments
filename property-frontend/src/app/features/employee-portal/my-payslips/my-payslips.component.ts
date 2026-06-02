import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { HrService, PayslipItem } from '../../../core/services/hr.service';
import { SnackService } from '../../../core/services/snack.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EstateLovOption, EstateLovSelectComponent } from '../../../shared/components/estate-lov-select/estate-lov-select.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-my-payslips',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, DecimalPipe, CurrencyPipe,
    FormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    TranslateModule,
    PageHeaderComponent, EmptyStateComponent, EstateLovSelectComponent
  ],
  template: `
    <app-page-header
      [title]="('INLINE_TEXT.MY_PAYSLIPS' | translate)"
      [subtitle]="('INLINE_TEXT.VIEW_ALL_YOUR_SALARY_PAYSLIPS' | translate)">
    </app-page-header>

    <div class="page-body">

      <div *ngIf="loading" class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="finance-filter-strip" *ngIf="!loading && allPayslips.length > 0">
        <app-estate-lov-select
          [label]="'MAINTENANCE.STATUS'"
          [options]="statusLovOptions"
          [(ngModel)]="filterStatus">
        </app-estate-lov-select>
      </div>

      <app-empty-state
        *ngIf="!loading && filteredPayslips.length === 0"
        icon="receipt_long"
        [message]="('INLINE_TEXT.NO_PAYSLIPS_FOUND_YET' | translate)">
      </app-empty-state>

      <div *ngIf="!loading && filteredPayslips.length > 0" class="payslips-grid">
        <div
          *ngFor="let slip of filteredPayslips"
          class="payslip-card"
          [class.paid]="slip.paid"
          (click)="openDetail(slip)"
          style="cursor:pointer">

          <div class="payslip-header">
            <div class="period-badge" [class.paid-badge]="slip.paid">
              <mat-icon>{{ slip.paid ? 'check_circle' : 'pending' }}</mat-icon>
              <span>{{ slip.paid ? (('INLINE_TEXT.PAID_2' | translate)) : (('INLINE_TEXT.PENDING' | translate)) }}</span>
            </div>
            <button mat-icon-button (click)="$event.stopPropagation(); printSlip(slip)"
                    [matTooltip]="('INLINE_TEXT.PRINT' | translate)">
              <mat-icon>print</mat-icon>
            </button>
          </div>

          <div class="payslip-net">
            <span class="net-label">{{ ('INLINE_TEXT.NET_SALARY' | translate) }}</span>
            <span class="net-amount">{{ slip.netSalary | number:'1.2-2' }}</span>
          </div>

          <div class="payslip-breakdown">
            <div class="breakdown-row">
              <span>{{ ('INLINE_TEXT.BASIC_SALARY' | translate) }}</span>
              <span>{{ slip.basicSalary | number:'1.2-2' }}</span>
            </div>
            <div class="breakdown-row" *ngIf="(slip.housingAllowance ?? 0) > 0">
              <span>{{ ('INLINE_TEXT.HOUSING' | translate) }}</span>
              <span>{{ slip.housingAllowance | number:'1.2-2' }}</span>
            </div>
            <div class="breakdown-row" *ngIf="(slip.transportAllowance ?? 0) > 0">
              <span>{{ ('INLINE_TEXT.TRANSPORT' | translate) }}</span>
              <span>{{ slip.transportAllowance | number:'1.2-2' }}</span>
            </div>
            <div class="breakdown-row deduction" *ngIf="(slip.totalDeductions ?? 0) > 0">
              <span>{{ ('INLINE_TEXT.TOTAL_DEDUCTIONS' | translate) }}</span>
              <span>- {{ slip.totalDeductions | number:'1.2-2' }}</span>
            </div>
            <div class="breakdown-row bonus" *ngIf="(slip.bonusAmount ?? 0) > 0">
              <span>{{ ('INLINE_TEXT.BONUSES' | translate) }}</span>
              <span>+ {{ slip.bonusAmount | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="payslip-footer" *ngIf="slip.paid && slip.paidDate">
            <mat-icon>calendar_today</mat-icon>
            <span>{{ slip.paidDate | date:'dd/MM/yyyy' }}</span>
            <span *ngIf="slip.paymentMethod" class="method-badge">{{ slip.paymentMethod }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-body { padding: 16px 24px; }
    .loading-center { display: flex; justify-content: center; padding: 60px 0; }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      margin: 0 0 16px; padding: 12px 16px;
      border: 1px solid var(--line, #e4d8c8); background: var(--surface, #fffdf8); border-radius: 8px;
    }
    .finance-filter-strip label { font-size: 13px; color: var(--text-muted, #888); white-space: nowrap; }

    .payslips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .payslip-card {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 20px;
      transition: box-shadow 0.2s, transform 0.15s;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .payslip-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .payslip-card.paid { border-color: #22c55e30; background: #f0fdf4; }

    .payslip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .period-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #6b7280;
      padding: 4px 10px;
      border-radius: 20px;
      background: #f3f4f6;
    }
    .period-badge.paid-badge { background: #dcfce7; color: #16a34a; }
    .period-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .payslip-net {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px dashed #e5e7eb;
    }
    .net-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .net-amount { font-size: 28px; font-weight: 700; color: #1a1a2e; }

    .payslip-breakdown { display: flex; flex-direction: column; gap: 6px; }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #374151;
    }
    .breakdown-row.deduction span:last-child { color: #ef4444; }
    .breakdown-row.bonus span:last-child { color: #22c55e; }

    .payslip-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6b7280;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }
    .payslip-footer mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .method-badge {
      background: #e0f2fe;
      color: #0284c7;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
    }

    @media (max-width: 600px) {
      .payslips-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MyPayslipsComponent implements OnInit {
  allPayslips: PayslipItem[] = [];
  filterStatus = 'all';
  loading = true;

  get statusLovOptions(): EstateLovOption[] {
    return [
      { value: 'all', label: this.i18n.instant('COMMON.ALL') },
      { value: 'paid', label: this.i18n.instant('INLINE_TEXT.PAID_2') },
      { value: 'pending', label: this.i18n.instant('INLINE_TEXT.PENDING') }
    ];
  }

  get filteredPayslips(): PayslipItem[] {
    if (this.filterStatus === 'paid') return this.allPayslips.filter((s) => s.paid);
    if (this.filterStatus === 'pending') return this.allPayslips.filter((s) => !s.paid);
    return this.allPayslips;
  }

  constructor(
    private readonly hrService: HrService,
    private readonly snack: SnackService,
    private readonly router: Router,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.hrService.getMyPayslips().subscribe({
      next: (res) => {
        this.allPayslips = res.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.error(this.i18n.instant('INLINE_TEXT.FAILED_TO_LOAD_PAYSLIPS'));
      }
    });
  }

  openDetail(slip: PayslipItem): void {
    this.router.navigate(['/employee/my-payslips', slip.id]);
  }

  printSlip(slip: PayslipItem): void {
    this.router.navigate(['/employee/my-payslips', slip.id], { queryParams: { print: '1' } });
  }
}
