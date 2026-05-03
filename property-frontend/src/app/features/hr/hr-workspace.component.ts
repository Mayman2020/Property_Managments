import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../shared/components/filter-bar/filter-bar.component';
import {
  HrService,
  LeaveRequestItem,
  PayrollRunDetail,
  PayrollRunItem,
  PayslipItem
} from '../../core/services/hr.service';
import { Property, PropertyService } from '../../core/services/property.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { EmployeeDialogComponent } from './employee-dialog.component';

@Component({
  selector: 'app-hr-workspace',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule,
    PageHeaderComponent,
    FilterBarComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header [eyebrow]="'HR.EYEBROW' | translate" [title]="title" [subtitle]="'HR.SUBTITLE' | translate">
        <button mat-flat-button *ngIf="section === 'employees-list'" (click)="openAddEmployee()">
          <span class="material-icons">add</span>{{ 'HR.ADD_EMPLOYEE' | translate }}
        </button>
      </app-page-header>

      <div class="workspace-filter-bar" *ngIf="section === 'employees-list' && properties.length > 1">
        <app-filter-bar [filters]="pageFilters" (filtersChange)="onFilterBarChange($event)"></app-filter-bar>
      </div>

      <div class="app-card" *ngIf="section === 'employees-list' || section === 'employee-detail'">
        <div class="app-table-wrap" *ngIf="employees.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'HR.CODE_COL' | translate }}</th>
                <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                <th>{{ 'HR.JOB_TITLE_COL' | translate }}</th>
                <th>{{ 'HR.EMAIL_COL' | translate }}</th>
                <th>{{ 'HR.STATUS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of employees">
                <td>#{{ item.id }}</td>
                <td>{{ item.fullName }}</td>
                <td>{{ employeeJobTitle(item) }}</td>
                <td>{{ item.email }}</td>
                <td><span class="status-badge" [attr.data-status]="item.isActive ? 'ACTIVE' : 'INACTIVE'">{{ item.isActive ? ('COMMON.ACTIVE' | translate) : ('COMMON.INACTIVE' | translate) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-container *ngIf="section === 'payroll-list'">
        <section class="app-card">
          <div class="app-card-body">
            <form class="workspace-form" [formGroup]="payrollForm" (ngSubmit)="generatePayroll()">
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.YEAR_LABEL' | translate }}</mat-label><input matInput type="number" formControlName="payPeriodYear"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.MONTH_LABEL' | translate }}</mat-label><input matInput type="number" min="1" max="12" formControlName="payPeriodMonth"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.PROPERTY_ID_LABEL' | translate }}</mat-label><input matInput type="number" formControlName="propertyId"></mat-form-field>
              <div class="workspace-actions"><button mat-raised-button type="submit" [disabled]="payrollForm.invalid">{{ 'HR.GENERATE_PAYROLL' | translate }}</button></div>
            </form>
          </div>
        </section>

        <div class="app-card">
          <div class="app-table-wrap" *ngIf="payrollRuns.length; else emptyTpl">
            <table class="app-data-table">
              <thead>
                <tr>
                  <th>{{ 'HR.PERIOD_COL' | translate }}</th>
                  <th>{{ 'HR.BASE_TOTAL_COL' | translate }}</th>
                  <th>{{ 'HR.DEDUCTIONS_COL' | translate }}</th>
                  <th>{{ 'HR.NET_COL' | translate }}</th>
                  <th>{{ 'HR.STATUS_COL' | translate }}</th>
                  <th>{{ 'HR.DETAIL_COL' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of payrollRuns">
                  <td>{{ item.payPeriodMonth }}/{{ item.payPeriodYear }}</td>
                  <td>{{ item.totalBasic || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.totalDeductions || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.totalNet || 0 | number:'1.0-2' }}</td>
                  <td><span class="status-badge" [attr.data-status]="item.status || 'DRAFT'">{{ item.status || 'DRAFT' }}</span></td>
                  <td><a mat-stroked-button [routerLink]="['/admin/hr/payroll', item.id]">{{ 'HR.OPEN_BTN' | translate }}</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="section === 'payroll-detail'">
        <section class="stat-grid" *ngIf="payrollDetail">
          <article class="stat-card surface-glow"><div class="stat-label">{{ 'HR.BASIC_LABEL' | translate }}</div><div class="stat-value">{{ payrollDetail.totalBasic || 0 | number:'1.0-2' }}</div></article>
          <article class="stat-card surface-glow"><div class="stat-label">{{ 'HR.ALLOWANCES_LABEL' | translate }}</div><div class="stat-value">{{ payrollDetail.totalAllowances || 0 | number:'1.0-2' }}</div></article>
          <article class="stat-card surface-glow"><div class="stat-label">{{ 'HR.DEDUCTIONS_COL' | translate }}</div><div class="stat-value">{{ payrollDetail.totalDeductions || 0 | number:'1.0-2' }}</div></article>
          <article class="stat-card surface-glow"><div class="stat-label">{{ 'HR.BONUSES_LABEL' | translate }}</div><div class="stat-value">{{ payrollDetail.totalBonuses || 0 | number:'1.0-2' }}</div></article>
          <article class="stat-card surface-glow"><div class="stat-label">{{ 'HR.NET_COL' | translate }}</div><div class="stat-value">{{ payrollDetail.totalNet || 0 | number:'1.0-2' }}</div></article>
        </section>

        <section class="app-card">
          <div class="app-card-body">
            <div class="toolbar-row">
              <div class="toolbar-copy">
                <h3>{{ 'HR.PAYROLL_ACTIONS' | translate }}</h3>
                <p>{{ payrollDetail?.payPeriodMonth }}/{{ payrollDetail?.payPeriodYear }} - {{ payrollDetail?.status || 'DRAFT' }}</p>
              </div>
              <div class="toolbar-actions" *ngIf="payrollDetail">
                <button mat-stroked-button (click)="approvePayroll()" [disabled]="payrollDetail.status !== 'DRAFT'">{{ 'HR.APPROVE_PAYROLL' | translate }}</button>
                <button mat-raised-button (click)="markPaid()" [disabled]="payrollDetail.status !== 'APPROVED'">{{ 'HR.MARK_PAID' | translate }}</button>
              </div>
            </div>
          </div>
        </section>

        <section class="app-card" *ngIf="payrollDetail">
          <div class="app-card-body">
            <div class="inline-forms">
              <form class="mini-form" [formGroup]="bonusForm" (ngSubmit)="addBonus()">
                <h4>{{ 'HR.ADD_BONUS' | translate }}</h4>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.EMPLOYEE_ID_LABEL' | translate }}</mat-label><input matInput type="number" formControlName="employeeId"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.BONUS_TYPE_LABEL' | translate }}</mat-label><input matInput formControlName="bonusType"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.AMOUNT_LABEL' | translate }}</mat-label><input matInput type="number" formControlName="amount"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.REASON_LABEL' | translate }}</mat-label><input matInput formControlName="reason"></mat-form-field>
                <button mat-raised-button type="submit" [disabled]="bonusForm.invalid">{{ 'ACTIONS.ADD' | translate }}</button>
              </form>

              <form class="mini-form" [formGroup]="advanceForm" (ngSubmit)="createAdvance()">
                <h4>{{ 'HR.CREATE_ADVANCE' | translate }}</h4>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.EMPLOYEE_ID_LABEL' | translate }}</mat-label><input matInput type="number" formControlName="employeeId"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.AMOUNT_LABEL' | translate }}</mat-label><input matInput type="number" formControlName="amount"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.REQUEST_DATE_LABEL' | translate }}</mat-label><input matInput [matDatepicker]="advanceDatePicker" formControlName="requestDate"><mat-datepicker-toggle matIconSuffix [for]="advanceDatePicker"></mat-datepicker-toggle><mat-datepicker #advanceDatePicker></mat-datepicker></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>{{ 'HR.REASON_LABEL' | translate }}</mat-label><input matInput formControlName="reason"></mat-form-field>
                <button mat-raised-button type="submit" [disabled]="advanceForm.invalid">{{ 'COMMON.SAVE' | translate }}</button>
              </form>
            </div>
          </div>
        </section>

        <div class="app-card">
          <div class="app-table-wrap" *ngIf="payrollDetail?.payslips?.length; else emptyTpl">
            <table class="app-data-table">
              <thead>
                <tr>
                  <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                  <th>{{ 'HR.EARNINGS_COL' | translate }}</th>
                  <th>{{ 'HR.BONUSES_LABEL' | translate }}</th>
                  <th>{{ 'HR.ADVANCE_COL' | translate }}</th>
                  <th>{{ 'HR.DEDUCTIONS_COL' | translate }}</th>
                  <th>{{ 'HR.NET_COL' | translate }}</th>
                  <th>{{ 'HR.PAID_COL' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of payrollDetail?.payslips" (click)="selectPayslip(item)" [class.selected-row]="selectedPayslip?.id === item.id">
                  <td>{{ item.employeeName || '-' }}<div class="muted-line">{{ item.employeeCode || '' }}</div></td>
                  <td>{{ item.totalEarnings || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.bonusAmount || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.advanceDeduction || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.totalDeductions || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.netSalary || 0 | number:'1.0-2' }}</td>
                  <td>{{ item.paid ? ('HR.YES' | translate) : ('HR.NO' | translate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <section class="app-card" *ngIf="selectedPayslip">
          <div class="app-card-body">
            <form class="workspace-form" [formGroup]="payslipForm" (ngSubmit)="updatePayslip()">
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.OVERTIME' | translate }}</mat-label><input matInput type="number" formControlName="overtimeAmount"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.ABSENCE_DEDUCTION' | translate }}</mat-label><input matInput type="number" formControlName="absenceDeduction"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.LATE_DEDUCTION' | translate }}</mat-label><input matInput type="number" formControlName="lateDeduction"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.PENALTY' | translate }}</mat-label><input matInput type="number" formControlName="penaltyDeduction"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.INSURANCE' | translate }}</mat-label><input matInput type="number" formControlName="insuranceDeduction"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ 'HR.OTHER_DEDUCTIONS' | translate }}</mat-label><input matInput type="number" formControlName="otherDeductions"></mat-form-field>
              <mat-form-field appearance="outline" class="full-width"><mat-label>{{ 'COMMON.NOTES' | translate }}</mat-label><input matInput formControlName="notes"></mat-form-field>
              <div class="workspace-actions"><button mat-raised-button type="submit">{{ 'HR.SAVE_DEDUCTIONS' | translate }}</button></div>
            </form>
          </div>
        </section>
      </ng-container>

      <div class="app-card" *ngIf="section === 'leaves'">
        <div class="app-table-wrap" *ngIf="leaveRequests.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                <th>{{ 'HR.TYPE_COL' | translate }}</th>
                <th>{{ 'HR.FROM_COL' | translate }}</th>
                <th>{{ 'HR.TO_COL' | translate }}</th>
                <th>{{ 'HR.DAYS_COL' | translate }}</th>
                <th>{{ 'HR.STATUS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of leaveRequests">
                <td>{{ item.employeeName || '-' }}</td>
                <td>{{ item.leaveTypeName || '-' }}</td>
                <td>{{ item.startDate | date:'dd/MM/yyyy' }}</td>
                <td>{{ item.endDate | date:'dd/MM/yyyy' }}</td>
                <td>{{ item.daysCount }}</td>
                <td><span class="status-badge" [attr.data-status]="item.status || 'PENDING'">{{ item.status || 'PENDING' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="app-empty-state">
          <span class="material-icons empty-icon">badge</span>
          <h4>{{ 'HR.NO_DATA' | translate }}</h4>
          <p>{{ 'HR.NO_DATA_DESC' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .workspace-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .workspace-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
    }
    .toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .toolbar-copy h3 {
      margin: 0 0 4px;
    }
    .toolbar-copy p {
      margin: 0;
      opacity: .7;
    }
    .toolbar-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .inline-forms {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    .mini-form {
      display: grid;
      gap: 12px;
    }
    .selected-row {
      background: rgba(26, 115, 232, .08);
    }
    .muted-line {
      font-size: 12px;
      opacity: .7;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .stat-card {
      padding: 16px;
      border-radius: 18px;
      background: var(--card-bg, #fff);
      border: 1px solid rgba(0,0,0,.06);
    }
    .stat-label {
      font-size: 13px;
      opacity: .7;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 700;
    }
    @media (max-width: 1000px) {
      .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .inline-forms { grid-template-columns: 1fr; }
    }
    @media (max-width: 800px) {
      .workspace-form { grid-template-columns: 1fr; }
      .stat-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class HrWorkspaceComponent implements OnInit {
  section = 'employees-list';
  employees: User[] = [];
  properties: Property[] = [];
  filterPropertyId: number | null = null;
  pageFilters: FilterSpec[] = [];
  payrollRuns: PayrollRunItem[] = [];
  payrollDetail?: PayrollRunDetail;
  selectedPayslip?: PayslipItem;
  leaveRequests: LeaveRequestItem[] = [];

  readonly payrollForm = this.fb.group({
    propertyId: [null as number | null],
    payPeriodYear: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    payPeriodMonth: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]]
  });

  readonly bonusForm = this.fb.group({
    employeeId: [null as number | null, Validators.required],
    bonusType: ['PERFORMANCE', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    reason: ['']
  });

  readonly advanceForm = this.fb.group({
    employeeId: [null as number | null, Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    requestDate: [new Date(), Validators.required],
    reason: ['']
  });

  readonly payslipForm = this.fb.group({
    overtimeAmount: [0],
    absenceDeduction: [0],
    lateDeduction: [0],
    penaltyDeduction: [0],
    insuranceDeduction: [0],
    otherDeductions: [0],
    notes: ['']
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: HrService,
    private readonly propertySvc: PropertyService,
    private readonly userSvc: UserService,
    private readonly dialog: MatDialog,
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    readonly i18n: I18nService
  ) {}

  get title(): string {
    const map: Record<string, string> = {
      'employees-list': 'HR.EMPLOYEES_TITLE',
      'employee-form': 'HR.NEW_EMPLOYEE_TITLE',
      'employee-detail': 'HR.EMPLOYEE_DETAIL_TITLE',
      'payroll-list': 'HR.PAYROLL_LIST_TITLE',
      'payroll-detail': 'HR.PAYROLL_DETAIL_TITLE',
      leaves: 'HR.LEAVES_TITLE',
      attendance: 'HR.ATTENDANCE_TITLE'
    };
    return this.translate.instant(map[this.section] ?? 'HR.EMPLOYEES_TITLE');
  }

  employeeJobTitle(item: User): string {
    const roleKey = `ROLE.${item.role}`;
    return this.i18n.instant(roleKey);
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'employees-list';

    if (this.section.startsWith('employee')) {
      this.propertySvc.getAll(0, 500).subscribe({ next: (res) => { this.properties = res.data?.content ?? []; this.setupFilters(); }, error: () => {} });
      this.loadEmployees();
    }
    if (this.section === 'payroll-list') {
      this.loadPayrollRuns();
    }
    if (this.section === 'payroll-detail') {
      this.loadPayrollDetail();
    }
    if (this.section === 'leaves') {
      this.service.getLeaveRequests({ page: 0, size: 50 }).subscribe({
        next: (res) => { this.leaveRequests = res.data?.content ?? []; },
        error: () => { this.leaveRequests = []; }
      });
    }
  }

  openAddEmployee(): void {
    this.dialog.open(EmployeeDialogComponent, {
      data: { properties: this.properties, defaultPropertyId: this.filterPropertyId ?? undefined },
      width: '580px',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => { if (ok) this.loadEmployees(); });
  }

  private setupFilters(): void {
    this.pageFilters = [
      {
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      }
    ];
  }

  onFilterBarChange(values: any): void {
    if (values?.filterPropertyId !== undefined) this.filterPropertyId = values.filterPropertyId;
    this.loadEmployees();
  }

  onPropertyChange(): void {
    this.loadEmployees();
  }

  generatePayroll(): void {
    if (this.payrollForm.invalid) return;
    const payload = this.payrollForm.getRawValue();
    this.service.generatePayroll({
      propertyId: payload.propertyId ?? undefined,
      payPeriodYear: Number(payload.payPeriodYear),
      payPeriodMonth: Number(payload.payPeriodMonth)
    }).subscribe({
      next: (res) => {
        const id = res.data?.id;
        this.loadPayrollRuns();
        if (id) {
          this.router.navigate(['/admin/hr/payroll', id]);
        }
      }
    });
  }

  addBonus(): void {
    if (!this.payrollDetail || this.bonusForm.invalid) return;
    const payload = this.bonusForm.getRawValue();
    this.service.addBonus(this.payrollDetail.id, {
      employeeId: Number(payload.employeeId),
      bonusType: String(payload.bonusType || 'PERFORMANCE'),
      amount: Number(payload.amount),
      reason: payload.reason || undefined
    }).subscribe({
      next: (res) => {
        this.applyPayrollDetail(res.data);
        this.bonusForm.reset({ employeeId: null, bonusType: 'PERFORMANCE', amount: 0, reason: '' });
      }
    });
  }

  createAdvance(): void {
    if (!this.payrollDetail || this.advanceForm.invalid) return;
    const payload = this.advanceForm.getRawValue();
    this.service.createSalaryAdvance({
      employeeId: Number(payload.employeeId),
      amount: Number(payload.amount),
      requestDate: this.toYmd(payload.requestDate as Date | string),
      deductedYear: this.payrollDetail.payPeriodYear,
      deductedMonth: this.payrollDetail.payPeriodMonth,
      reason: payload.reason || undefined
    }).subscribe({
      next: () => {
        this.loadPayrollDetail();
        this.advanceForm.reset({ employeeId: null, amount: 0, requestDate: new Date(), reason: '' });
      }
    });
  }

  approvePayroll(): void {
    if (!this.payrollDetail) return;
    this.service.approvePayroll(this.payrollDetail.id).subscribe({
      next: (res) => this.applyPayrollDetail(res.data)
    });
  }

  markPaid(): void {
    if (!this.payrollDetail) return;
    this.service.markPayrollPaid(this.payrollDetail.id, {
      paidDate: this.today(),
      paymentMethod: 'BANK_TRANSFER'
    }).subscribe({
      next: (res) => this.applyPayrollDetail(res.data)
    });
  }

  selectPayslip(item: PayslipItem): void {
    this.selectedPayslip = item;
    this.payslipForm.reset({
      overtimeAmount: item.overtimeAmount || 0,
      absenceDeduction: item.absenceDeduction || 0,
      lateDeduction: item.lateDeduction || 0,
      penaltyDeduction: item.penaltyDeduction || 0,
      insuranceDeduction: item.insuranceDeduction || 0,
      otherDeductions: item.otherDeductions || 0,
      notes: item.notes || ''
    });
  }

  updatePayslip(): void {
    if (!this.payrollDetail || !this.selectedPayslip) return;
    const payload = this.payslipForm.getRawValue();
    this.service.updatePayslip(this.payrollDetail.id, this.selectedPayslip.id, {
      overtimeAmount: Number(payload.overtimeAmount || 0),
      absenceDeduction: Number(payload.absenceDeduction || 0),
      lateDeduction: Number(payload.lateDeduction || 0),
      penaltyDeduction: Number(payload.penaltyDeduction || 0),
      insuranceDeduction: Number(payload.insuranceDeduction || 0),
      otherDeductions: Number(payload.otherDeductions || 0),
      notes: payload.notes || undefined
    }).subscribe({
      next: (res) => this.applyPayrollDetail(res.data)
    });
  }

  private loadEmployees(): void {
    const employeeRoles: string[] = ['HR_OFFICER', 'ACCOUNTANT', 'CONTRACTS_OFFICER', 'MAINTENANCE_OFFICER'];
    this.userSvc.getAll(0, 200).subscribe({
      next: (res) => {
        let users = res.data?.content ?? [];
        if (this.filterPropertyId) {
          users = users.filter(u => u.propertyId === this.filterPropertyId);
        }
        this.employees = users.filter(u => employeeRoles.includes(u.role));
      },
      error: () => { this.employees = []; }
    });
  }

  private loadPayrollRuns(): void {
    this.service.getPayrollRuns({ page: 0, size: 24 }).subscribe({
      next: (res) => { this.payrollRuns = res.data?.content ?? []; },
      error: () => { this.payrollRuns = []; }
    });
  }

  private loadPayrollDetail(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.service.getPayrollRun(id).subscribe({
      next: (res) => this.applyPayrollDetail(res.data),
      error: () => { this.payrollDetail = undefined; this.selectedPayslip = undefined; }
    });
  }

  private applyPayrollDetail(detail?: PayrollRunDetail): void {
    this.payrollDetail = detail;
    if (!detail?.payslips?.length) {
      this.selectedPayslip = undefined;
      return;
    }
    const nextSelected = this.selectedPayslip
      ? detail.payslips.find((item) => item.id === this.selectedPayslip?.id) || detail.payslips[0]
      : detail.payslips[0];
    this.selectPayslip(nextSelected);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toYmd(value: Date | string): string {
    if (typeof value === 'string') return value;
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
}
