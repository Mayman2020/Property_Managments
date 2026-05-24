import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../../shared/components/filter-bar/filter-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';
import { ExportColumn, TableExportToolbarComponent } from '../../../shared/components/table-export-toolbar/table-export-toolbar.component';
import {
  EmployeeItem,
  HrService,
  LeaveBalanceItem,
  LeaveRequestItem,
  PayrollDeductionItem,
  PayrollRunDetail,
  PayrollRunItem,
  PayslipItem
} from '../../../core/services/hr.service';
import { Property, PropertyService } from '../../../core/services/property.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { DeleteConfirmService } from '../../../core/services/delete-confirm.service';
import { SnackService } from '../../../core/services/snack.service';
import { EmployeeDialogComponent } from '../employee-dialog/employee-dialog.component';
import { LeaveRequestDialogComponent } from '../leave-request-dialog/leave-request-dialog.component';
import { ContractorCompanyService, AllCompanyOfficer } from '../../../core/services/contractor-company.service';
import { LookupCacheService } from '../../../core/services/lookup-cache.service';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-hr-workspace',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    PageHeaderComponent,
    FilterBarComponent,
    EmptyStateComponent,
    TablePagerComponent,
    TableExportToolbarComponent
  ],
  template: `
    <div class="app-page">
      <app-page-header
        [title]="title"
        [subtitle]="'HR.SUBTITLE' | translate"
        [breadcrumbs]="[
          { label: ('NAV.DASHBOARD' | translate), route: '/admin/dashboard' },
          { label: title }
        ]">
        <button mat-flat-button class="navy-btn" type="button" *ngIf="section === 'employees-list' && canAddEmployee()" (click)="openAddEmployee()">
          <mat-icon>add</mat-icon>
          {{ 'HR.ADD_EMPLOYEE' | translate }}
        </button>
        <button mat-flat-button class="navy-btn" type="button" *ngIf="section === 'payroll-list' && canManagePayroll()" (click)="generateCurrentPayroll()">
          <mat-icon>add</mat-icon>
          {{ 'HR.GENERATE_PAYROLL' | translate }}
        </button>
        <button mat-flat-button class="navy-btn" type="button" *ngIf="section === 'leaves' && canAddLeaveRequest()" (click)="openAddLeaveRequest()">
          <mat-icon>add</mat-icon>
          {{ 'HR.ADD_LEAVE_REQUEST' | translate }}
        </button>
        <button mat-flat-button class="navy-btn" type="button" *ngIf="section === 'deductions' && canCreateDeduction()" (click)="createDeduction()">
          <mat-icon>add</mat-icon>
          {{ 'HR.ADD_DEDUCTION' | translate }}
        </button>
      </app-page-header>

      <div class="finance-filter-strip" *ngIf="section === 'payroll-list' && properties.length > 0">
        <label>{{ 'REQUEST_FORM.PROPERTY' | translate }}</label>
        <select [(ngModel)]="filterPropertyId" (change)="onFilterBarChange({filterPropertyId: filterPropertyId})" class="estate-property-select">
          <option [ngValue]="null">{{ 'COMMON.ALL_PROPERTIES' | translate }}</option>
          <option *ngFor="let p of properties" [ngValue]="p.id">
            {{ i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName) }}
          </option>
        </select>
      </div>

      <div class="loading-center" *ngIf="loading && (section === 'employees-list' || section === 'employee-detail')">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="app-card table-card directory-table-card" *ngIf="!loading && (section === 'employees-list' || section === 'employee-detail')">
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top">
            <div class="directory-search">
              <mat-icon>search</mat-icon>
              <input [value]="searchTerm" (input)="onSearch($any($event.target).value)" [placeholder]="'ACTIONS.SEARCH' | translate">
            </div>
            <app-filter-bar *ngIf="pageFilters.length" [filters]="pageFilters" [filterValues]="currentFilterValues" (filtersChange)="onFilterBarChange($event)"></app-filter-bar>
            <button mat-icon-button class="clear-filters-btn" (click)="clearFiltersFromBar()" *ngIf="hasFiltersBar()" [matTooltip]="'ACTIONS.CLEAR_FILTERS' | translate">
              <mat-icon>filter_alt_off</mat-icon>
            </button>
            <app-table-export-toolbar
              permissionKey="hr"
              [title]="'HR.EMPLOYEES_TITLE' | translate"
              fileName="employees"
              [columns]="employeeExportColumns"
              [rows]="filteredEmployees">
            </app-table-export-toolbar>
          </div>
        </div>
        <div class="app-table-wrap" *ngIf="employees.length > 0 || hasFiltersBar(); else emptyEmployeesTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'HR.CODE_COL' | translate }}</th>
                <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                <th>{{ 'HR.JOB_TITLE_COL' | translate }}</th>
                <th>{{ 'HR.HIRE_DATE_COL' | translate }}</th>
                <th>{{ 'HR.SALARY_COL' | translate }}</th>
                <th>{{ 'HR.LEAVE_USED_COL' | translate }}</th>
                <th>{{ 'HR.LEAVE_REMAINING_COL' | translate }}</th>
                <th>{{ 'HR.EMAIL_COL' | translate }}</th>
                <th>{{ 'HR.STATUS_COL' | translate }}</th>
                <th>{{ 'REQUEST_LIST.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedEmployees">
                <td>#{{ item.id }}</td>
                <td>
                  <div class="employee-name-cell">
                    <img *ngIf="item.profileImageUrl" [src]="item.profileImageUrl" class="employee-avatar" alt="">
                    <span class="avatar-placeholder" *ngIf="!item.profileImageUrl">
                      {{ employeeName(item).charAt(0).toUpperCase() }}
                    </span>
                    <strong>{{ employeeName(item) }}</strong>
                  </div>
                </td>
                <td>{{ employeeJobTitle(item) }}</td>
                <td>{{ item.hireDate || '-' }}</td>
                <td>{{ item.basicSalary || '-' }}</td>
                <td>{{ leaveUsedDays(item.id) }}</td>
                <td>{{ leaveRemainingDays(item.id) }}</td>
                <td>{{ item.email || '--' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="employeeActive(item)" [class.badge-muted]="!employeeActive(item)">
                    <mat-icon>{{ employeeActive(item) ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ (employeeActive(item) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="app-icon-btn accent" type="button" (click)="openViewEmployee(item)" [matTooltip]="'ACTIONS.VIEW' | translate">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button class="app-icon-btn" type="button" *ngIf="canEditEmployee()" (click)="openEditEmployee(item)" [matTooltip]="'ACTIONS.EDIT' | translate">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="app-icon-btn danger" type="button" *ngIf="canDeleteEmployee()" (click)="removeEmployee(item)" [matTooltip]="'ACTIONS.DELETE' | translate">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredEmployees.length === 0">
                <td colspan="10" class="empty-row">{{ 'COMMON.NO_DATA' | translate }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-table-pager
          *ngIf="filteredEmployees.length > 0"
          [length]="filteredEmployees.length"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          (pageIndexChange)="pageIndex = $event">
        </app-table-pager>

        <ng-template #emptyEmployeesTpl>
          <app-empty-state
            icon="badge"
            [title]="'HR.NO_DATA' | translate"
            [message]="'HR.NO_DATA_DESC' | translate">
          </app-empty-state>
        </ng-template>
      </div>

      <!-- Company Officers Section -->
      <div class="app-card table-card directory-table-card" *ngIf="!loading && (section === 'employees-list' || section === 'employee-detail') && filteredOfficers.length > 0">
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top">
            <div class="section-label">
              <mat-icon>engineering</mat-icon>
              <span>{{ 'HR.COMPANY_OFFICERS_SECTION' | translate }}</span>
              <span class="count-chip">{{ filteredOfficers.length }}</span>
            </div>
          </div>
        </div>
        <div class="app-table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                <th>{{ 'CONTRACTORS.NAME' | translate }}</th>
                <th>{{ 'REQUEST_FORM.PROPERTY' | translate }}</th>
                <th>{{ 'HR.EMAIL_COL' | translate }}</th>
                <th>{{ 'HR.STATUS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of filteredOfficers">
                <td>
                  <div class="employee-name-cell">
                    <img *ngIf="o.profileImageUrl" [src]="o.profileImageUrl" class="employee-avatar" alt="">
                    <span class="avatar-placeholder" *ngIf="!o.profileImageUrl">
                      {{ officerName(o).charAt(0).toUpperCase() }}
                    </span>
                    <strong>{{ officerName(o) }}</strong>
                  </div>
                </td>
                <td>
                  <span class="company-tag">{{ officerCompanyName(o) }}</span>
                </td>
                <td>{{ officerPropertyName(o) }}</td>
                <td>{{ o.email || '--' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="o.active" [class.badge-muted]="!o.active">
                    <mat-icon>{{ o.active ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ (o.active ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') | translate }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="app-card table-card directory-table-card" *ngIf="section === 'leaves'">
        <div class="estate-table-toolbar directory-toolbar">
          <div class="directory-toolbar-top">
            <div class="section-label">
              <mat-icon>event_available</mat-icon>
              <span>{{ 'HR.LEAVES_TITLE' | translate }}</span>
              <span class="count-chip">{{ leaveRequests.length }}</span>
            </div>
            <app-table-export-toolbar
              permissionKey="hr"
              [title]="'HR.LEAVES_TITLE' | translate"
              fileName="leaves"
              [columns]="leaveExportColumns"
              [rows]="leaveRequests">
            </app-table-export-toolbar>
          </div>
        </div>
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
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pagedLeaveRequests">
                <td>{{ item.employeeName || '-' }}</td>
                <td>{{ leaveTypeLabel(item) }}</td>
                <td>{{ item.startDate | date:'dd/MM/yyyy' }}</td>
                <td>{{ item.endDate | date:'dd/MM/yyyy' }}</td>
                <td>{{ item.daysCount }}</td>
                <td><span class="status-badge" [attr.data-status]="item.status || 'PENDING'">{{ leaveStatusLabel(item.status) }}</span></td>
                <td class="actions-cell">
                  <button class="app-icon-btn primary-tint" type="button" *ngIf="item.status === 'PENDING' && canApproveLeave()" (click)="approveLeave(item.id)" [matTooltip]="'ACTIONS.APPROVE' | translate">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button class="app-icon-btn danger" type="button" *ngIf="item.status === 'PENDING' && canApproveLeave()" (click)="rejectLeave(item.id)" [matTooltip]="'ACTIONS.REJECT' | translate">
                    <mat-icon>close</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-table-pager
          *ngIf="leaveRequests.length > 0"
          [length]="leaveRequests.length"
          [pageSize]="pageSize"
          [pageIndex]="leavePageIndex"
          (pageIndexChange)="leavePageIndex = $event">
        </app-table-pager>
      </div>

      <div class="app-card" *ngIf="section === 'payroll-list'">
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
              <tr *ngFor="let run of payrollRuns">
                <td>{{ run.payPeriodMonth }}/{{ run.payPeriodYear }}</td>
                <td>{{ run.totalBasic || 0 }}</td>
                <td>{{ run.totalDeductions || 0 }}</td>
                <td>{{ run.totalNet || 0 }}</td>
                <td><span class="status-badge" [attr.data-status]="run.status || 'SUBMITTED'">{{ payrollStatusLabel(run.status) }}</span></td>
                <td class="actions-cell">
                  <button class="app-icon-btn view" type="button" (click)="openPayroll(run.id)" [matTooltip]="'COMMON.VIEW' | translate">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="app-card table-card" *ngIf="section === 'deductions'">
        <div class="app-table-wrap" *ngIf="!loading && deductions.length > 0; else emptyDeductionsTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                <th>{{ 'HR.DEDUCTION_AMOUNT' | translate }}</th>
                <th>{{ 'HR.DEDUCTION_REASON' | translate }}</th>
                <th>{{ 'HR.PAYROLL_MONTH' | translate }}</th>
                <th>{{ 'HR.STATUS_COL' | translate }}</th>
                <th>{{ 'HR.ACTIONS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of deductions">
                <td>{{ item.employeeName || ('#' + item.employeeId) }}</td>
                <td>{{ item.amount || 0 }}</td>
                <td>{{ item.reason }}</td>
                <td>{{ item.payrollMonth }}</td>
                <td><span class="status-badge" [attr.data-status]="item.status">{{ deductionStatusLabel(item.status) }}</span></td>
                <td class="actions-cell">
                  <button class="app-icon-btn primary-tint" type="button" *ngIf="item.status === 'DRAFT' && canSendDeduction()" (click)="sendDeduction(item.id)" [matTooltip]="'HR.SEND_TO_ACCOUNTANT' | translate">
                    <mat-icon>send</mat-icon>
                  </button>
                  <button class="app-icon-btn primary-tint" type="button" *ngIf="item.status === 'SENT_TO_ACCOUNTANT' && canReviewDeduction()" (click)="approveDeduction(item.id)" [matTooltip]="'ACTIONS.APPROVE' | translate">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button class="app-icon-btn danger" type="button" *ngIf="item.status === 'SENT_TO_ACCOUNTANT' && canReviewDeduction()" (click)="rejectDeduction(item.id)" [matTooltip]="'ACTIONS.REJECT' | translate">
                    <mat-icon>close</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyDeductionsTpl>
          <div *ngIf="!loading" class="app-empty-state">
            <span class="material-icons empty-icon">payments</span>
            <h4>{{ 'HR.NO_DEDUCTIONS' | translate }}</h4>
            <p>{{ 'HR.NO_DEDUCTIONS_DESC' | translate }}</p>
          </div>
        </ng-template>
      </div>

      <div class="app-card" *ngIf="section === 'payroll-detail' && payrollDetail">
        <div class="payroll-summary">
          <div><strong>{{ 'HR.PERIOD_COL' | translate }}</strong><span>{{ payrollDetail.payPeriodMonth }}/{{ payrollDetail.payPeriodYear }}</span></div>
          <div><strong>{{ 'HR.NET_COL' | translate }}</strong><span>{{ payrollDetail.totalNet || 0 }}</span></div>
          <div><strong>{{ 'HR.STATUS_COL' | translate }}</strong><span class="status-badge" [attr.data-status]="payrollDetail.status || 'SUBMITTED'">{{ payrollStatusLabel(payrollDetail.status) }}</span></div>
          <button mat-flat-button *ngIf="canMarkPayrollPaid(payrollDetail)" (click)="markPayrollPaid(payrollDetail.id)">{{ 'HR.MARK_PAID' | translate }}</button>
        </div>

        <div class="app-table-wrap" *ngIf="payrollDetail.payslips?.length; else emptyTpl">
          <table class="app-data-table">
            <thead>
              <tr>
                <th>{{ 'HR.EMPLOYEE_COL' | translate }}</th>
                <th>{{ 'HR.BASIC_LABEL' | translate }}</th>
                <th>{{ 'HR.ALLOWANCES_LABEL' | translate }}</th>
                <th>{{ 'HR.BONUSES_LABEL' | translate }}</th>
                <th>{{ 'HR.DEDUCTIONS_COL' | translate }}</th>
                <th>{{ 'HR.NET_COL' | translate }}</th>
                <th>{{ 'HR.PAID_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let slip of payrollDetail.payslips">
                <td>{{ slip.employeeName || ('#' + slip.employeeId) }}</td>
                <td>{{ slip.basicSalary || 0 }}</td>
                <td>{{ allowancesTotal(slip) }}</td>
                <td>{{ slip.bonusAmount || 0 }}</td>
                <td>{{ slip.totalDeductions || 0 }}</td>
                <td>{{ slip.netSalary || 0 }}</td>
                <td>{{ slip.paid ? ('HR.YES' | translate) : ('HR.NO' | translate) }}</td>
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

    <!-- ATTENDANCE -->
    <div class="app-card table-card" *ngIf="section === 'attendance'">
      <div class="app-table-wrap" *ngIf="!loading && attendanceRecords.length > 0; else emptyAttendanceTpl">
        <table class="app-data-table">
          <thead>
            <tr>
              <th>{{ 'HR.ATTENDANCE_EMPLOYEE' | translate }}</th>
              <th>{{ 'HR.ATTENDANCE_DATE' | translate }}</th>
              <th>{{ 'HR.ATTENDANCE_CHECK_IN' | translate }}</th>
              <th>{{ 'HR.ATTENDANCE_CHECK_OUT' | translate }}</th>
              <th>{{ 'HR.ATTENDANCE_LATE' | translate }}</th>
              <th>{{ 'HR.ATTENDANCE_STATUS' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rec of attendanceRecords">
              <td><strong>{{ rec.employeeName || '—' }}</strong></td>
              <td>{{ rec.attendanceDate | date:'mediumDate' }}</td>
              <td>{{ rec.checkIn || '—' }}</td>
              <td>{{ rec.checkOut || '—' }}</td>
              <td>{{ rec.lateMinutes != null ? (rec.lateMinutes + ' ' + ('HR.MINUTES' | translate)) : '—' }}</td>
              <td>
                <span class="badge"
                      [class.badge-success]="rec.status === 'PRESENT'"
                      [class.badge-muted]="rec.status !== 'PRESENT'">
                  {{ rec.status || '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #emptyAttendanceTpl>
        <div *ngIf="!loading" class="app-empty-state">
          <span class="material-icons empty-icon">schedule</span>
          <h4>{{ 'HR.NO_ATTENDANCE' | translate }}</h4>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .navy-btn { background: var(--navy-800) !important; color: white !important; }
    .navy-btn mat-icon { margin-inline-end: 6px; }
    .finance-filter-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      margin: 0 0 16px; padding: 12px 16px;
      border: 1px solid var(--line, #e4d8c8); background: var(--surface, #fffdf8); border-radius: 8px;
    }
    .finance-filter-strip label { color: var(--text-muted); font-weight: 700; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .badge-success { background: #e8f5e9; color: #2e7d32; }
    .badge-muted { background: #f5f5f5; color: #9e9e9e; }
    .actions-cell {
      display: flex;
      gap: 4px;
      flex-wrap: nowrap;
      align-items: center;
    }
    .app-icon-btn.danger mat-icon { color: var(--error, #d32f2f); }
    .employee-name-cell { display: flex; align-items: center; gap: 10px; }
    .employee-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--line); flex-shrink: 0; }
    .avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: var(--navy-800); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 700; flex-shrink: 0; }
    .table-card { padding: 0; overflow: hidden; }
    .payroll-summary {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .payroll-summary div {
      display: grid;
      gap: 4px;
      min-width: 140px;
    }
    .payroll-summary span {
      color: var(--text-muted);
    }
    .section-label { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--navy-800); font-size: 0.95rem; }
    .section-label mat-icon { color: var(--navy-600); font-size: 20px; width: 20px; height: 20px; }
    .count-chip { background: var(--navy-100); color: var(--navy-800); border-radius: 12px; padding: 2px 8px; font-size: 0.78rem; font-weight: 700; }
    .company-tag { background: #e8f5e9; color: #2e7d32; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
    @media (max-width: 1000px) {
    }
    @media (max-width: 800px) {
    }
  `]
})
export class HrWorkspaceComponent implements OnInit {
  section = 'employees-list';
  employees: EmployeeItem[] = [];
  companyOfficers: AllCompanyOfficer[] = [];
  loading = true;
  readonly pageSize = 5;
  pageIndex = 0;
  leavePageIndex = 0;
  properties: Property[] = [];
  filterPropertyId: number | null = null;
  filterStatus: string | null = null;
  currentFilterValues: Record<string, unknown> = { filterPropertyId: null, filterStatus: null };
  searchTerm = '';
  pageFilters: FilterSpec[] = [];
  leaveRequests: LeaveRequestItem[] = [];
  leaveBalanceByEmployeeId = new Map<number, LeaveBalanceItem>();
  payrollRuns: PayrollRunItem[] = [];
  payrollDetail: PayrollRunDetail | null = null;
  deductions: PayrollDeductionItem[] = [];
  attendanceRecords: import('../../../core/services/hr.service').AttendanceItem[] = [];
  attendancePage = 0;
  attendanceTotal = 0;
  readonly attendancePageSize = 20;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: HrService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService,
    readonly i18n: I18nService,
    private readonly auth: AuthService,
    private readonly permissions: PermissionService,
    private readonly router: Router,
    private readonly snack: SnackService,
    private readonly deleteConfirm: DeleteConfirmService,
    private readonly contractorSvc: ContractorCompanyService,
    private readonly lookupCache: LookupCacheService
  ) {}

  get isSuperAdmin(): boolean { return this.auth.isSuperAdmin(); }

  canDeleteEmployee(): boolean {
    return this.permissions.can('hr', 'delete');
  }

  get pagedEmployees(): EmployeeItem[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredEmployees.slice(start, start + this.pageSize);
  }

  get pagedLeaveRequests(): LeaveRequestItem[] {
    const start = this.leavePageIndex * this.pageSize;
    return this.leaveRequests.slice(start, start + this.pageSize);
  }

  get filteredEmployees(): EmployeeItem[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.employees.filter((employee) => this.matchesEmployeeFilters(employee, q));
  }

  get employeeExportColumns(): ExportColumn<EmployeeItem>[] {
    return [
      { header: this.i18n.instant('HR.CODE_COL'), value: (row) => row.employeeCode || `#${row.id}` },
      { header: this.i18n.instant('HR.EMPLOYEE_COL'), value: (row) => this.employeeName(row) },
      { header: this.i18n.instant('HR.JOB_TITLE_COL'), value: (row) => this.employeeJobTitle(row) },
      { header: this.i18n.instant('HR.HIRE_DATE_COL'), value: (row) => row.hireDate || '-' },
      { header: this.i18n.instant('HR.SALARY_COL'), value: (row) => row.basicSalary ?? '-' },
      { header: this.i18n.instant('HR.EMAIL_COL'), value: (row) => row.email || '-' },
      { header: this.i18n.instant('HR.STATUS_COL'), value: (row) => this.i18n.instant(this.employeeActive(row) ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE') }
    ];
  }

  get leaveExportColumns(): ExportColumn<LeaveRequestItem>[] {
    return [
      { header: this.i18n.instant('HR.EMPLOYEE_COL'), value: (row) => row.employeeName || '-' },
      { header: this.i18n.instant('HR.TYPE_COL'), value: (row) => this.leaveTypeLabel(row) },
      { header: this.i18n.instant('HR.FROM_COL'), value: (row) => row.startDate },
      { header: this.i18n.instant('HR.TO_COL'), value: (row) => row.endDate },
      { header: this.i18n.instant('HR.DAYS_COL'), value: (row) => row.daysCount },
      { header: this.i18n.instant('HR.STATUS_COL'), value: (row) => this.leaveStatusLabel(row.status) }
    ];
  }

  get title(): string {
    const map: Record<string, string> = {
      'employees-list': 'HR.EMPLOYEES_TITLE',
      'employee-form': 'HR.NEW_EMPLOYEE_TITLE',
      'employee-detail': 'HR.EMPLOYEE_DETAIL_TITLE',
      'payroll-list': 'HR.PAYROLL_LIST_TITLE',
      'payroll-detail': 'HR.PAYROLL_DETAIL_TITLE',
      deductions: 'HR.DEDUCTIONS_TITLE',
      leaves: 'HR.LEAVES_TITLE',
      attendance: 'HR.ATTENDANCE_TITLE'
    };
    return this.translate.instant(map[this.section] ?? 'HR.EMPLOYEES_TITLE');
  }

  canApproveLeave(): boolean {
    return !this.auth.hasRole('ACCOUNTANT');
  }

  canAddLeaveRequest(): boolean {
    return this.permissions.can('hr', 'create');
  }

  openAddLeaveRequest(): void {
    this.dialog.open(LeaveRequestDialogComponent, {
      data: { employees: this.employees },
      width: '500px',
      panelClass: 'app-dialog-panel',
      disableClose: true
    }).afterClosed().subscribe((ok) => {
      if (ok) this.reloadLeaves();
    });
  }

  canAddEmployee(): boolean {
    return this.permissions.can('hr', 'create');
  }

  canEditEmployee(): boolean {
    return this.permissions.can('hr', 'edit');
  }

  canManagePayroll(): boolean {
    return this.permissions.can('hr', 'create') || this.permissions.can('hr', 'edit');
  }

  canCreateDeduction(): boolean {
    return this.permissions.can('hr', 'create');
  }

  canSendDeduction(): boolean {
    return this.permissions.can('hr', 'submit') || this.permissions.can('hr', 'edit');
  }

  canReviewDeduction(): boolean {
    return this.auth.hasRole('ACCOUNTANT') || this.auth.hasRole('SUPER_ADMIN') || this.auth.hasRole('GENERAL_MANAGER');
  }

  canMarkPayrollPaid(run: PayrollRunDetail): boolean {
    return this.canManagePayroll() && run.status === 'APPROVED';
  }

  loadAttendance(): void {
    this.loading = true;
    this.service.getAttendance({ page: this.attendancePage, size: this.attendancePageSize }).subscribe({
      next: (res) => {
        this.attendanceRecords = res.data?.content ?? [];
        this.attendanceTotal = res.data?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => { this.attendanceRecords = []; this.loading = false; }
    });
  }

  onAttendancePage(page: number): void {
    this.attendancePage = page;
    this.loadAttendance();
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'employees-list';
    this.lookupCache.preload('LEAVE_TYPE', 'LEAVE_STATUS', 'PAYROLL_STATUS').subscribe();

    if (this.section.startsWith('employee') || this.section.startsWith('payroll')) {
      this.propertySvc.getAll(0, 500).subscribe({
        next: (res) => {
          this.properties = res.data?.content ?? [];
          this.syncFilterValues();
          this.setupFilters();
        },
        error: () => {}
      });
    }
    if (this.section.startsWith('employee')) {
      this.loadEmployees();
    }
    if (this.section === 'payroll-list') {
      this.loadPayrollRuns();
    }
    if (this.section === 'deductions') {
      this.loadDeductions();
    }
    if (this.section === 'payroll-detail') {
      this.loadPayrollDetail(Number(this.route.snapshot.paramMap.get('id')));
    }
    if (this.section === 'attendance') {
      this.loadAttendance();
    }
    if (this.section === 'leaves') {
      this.service.getLeaveRequests({ page: 0, size: 50 }).subscribe({
        next: (res) => { this.leaveRequests = res.data?.content ?? []; this.leavePageIndex = 0; },
        error: () => { this.leaveRequests = []; this.leavePageIndex = 0; }
      });
      this.service.getEmployees({ page: 0, size: 200 }).subscribe({
        next: (res) => { this.employees = res.data?.content ?? []; },
        error: () => {}
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

  openEditEmployee(item: EmployeeItem): void {
    this.service.getEmployee(item.id).subscribe({
      next: (res) => {
        const employee = res.data;
        if (!employee) return;
        this.dialog.open(EmployeeDialogComponent, {
          data: { properties: this.properties, defaultPropertyId: employee.propertyId ?? this.filterPropertyId ?? undefined, employee, readOnly: false },
          width: '580px',
          panelClass: 'app-dialog-panel',
          disableClose: true
        }).afterClosed().subscribe((ok) => { if (ok) this.loadEmployees(); });
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  openViewEmployee(item: EmployeeItem): void {
    this.service.getEmployee(item.id).subscribe({
      next: (res) => {
        const employee = res.data;
        if (!employee) return;
        this.dialog.open(EmployeeDialogComponent, {
          data: { properties: this.properties, defaultPropertyId: employee.propertyId ?? this.filterPropertyId ?? undefined, employee, readOnly: true },
          width: '580px',
          panelClass: 'app-dialog-panel'
        });
      },
      error: () => this.snack.error(this.i18n.instant('COMMON.ERROR'))
    });
  }

  private setupFilters(): void {
    const filters: FilterSpec[] = [];
    if (this.properties.length > 0) {
      filters.push({
        key: 'filterPropertyId',
        label: 'REQUEST_FORM.PROPERTY',
        type: 'select',
        options: this.properties.map(p => ({
          value: p.id,
          label: this.i18n.currentLang === 'ar' ? (p.propertyNameAr || p.propertyName) : (p.propertyNameEn || p.propertyName)
        }))
      });
    }
    filters.push({
      key: 'filterStatus',
      label: 'HR.STATUS_COL',
      type: 'select',
      options: [
        { value: 'ACTIVE', label: this.i18n.instant('COMMON.ACTIVE') },
        { value: 'INACTIVE', label: this.i18n.instant('COMMON.INACTIVE') }
      ]
    });
    this.pageFilters = filters;
  }

  onFilterBarChange(values: any): void {
    if (values?.filterPropertyId !== undefined) {
      this.filterPropertyId = values.filterPropertyId;
    }
    if (values?.filterStatus !== undefined) this.filterStatus = values.filterStatus;
    this.syncFilterValues();
    this.pageIndex = 0;
    if (this.section === 'payroll-list') {
      this.loadPayrollRuns();
    } else {
      this.loadEmployees();
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
  }

  clearFiltersFromBar(): void {
    this.searchTerm = '';
    this.filterPropertyId = null;
    this.filterStatus = null;
    this.syncFilterValues();
    this.pageIndex = 0;
    this.loadEmployees();
  }

  hasFiltersBar(): boolean {
    return !!(this.searchTerm || (this.properties.length > 0 && this.filterPropertyId !== null) || this.filterStatus !== null);
  }

  private syncFilterValues(): void {
    this.currentFilterValues = {
      filterPropertyId: this.filterPropertyId,
      filterStatus: this.filterStatus
    };
  }

  onPropertyChange(): void {
    this.loadEmployees();
    this.loadLeaveBalances();
  }

  private loadEmployees(): void {
    this.loading = true;
    const params: Record<string, string | number> = { page: 0, size: 200 };
    if (this.filterPropertyId) {
      params['propertyId'] = this.filterPropertyId;
    }
    forkJoin({
      employees: this.service.getEmployees(params).pipe(catchError(() => of({ data: { content: [] as EmployeeItem[] } }))),
      officers: this.contractorSvc.getAllOfficers().pipe(catchError(() => of({ data: [] as AllCompanyOfficer[] })))
    }).subscribe(({ employees, officers }) => {
      this.employees = employees.data?.content ?? [];
      this.companyOfficers = officers.data ?? [];
      if (this.filterPropertyId) {
        this.companyOfficers = this.companyOfficers.filter(o => o.propertyId === this.filterPropertyId);
      }
      this.pageIndex = 0;
      this.loading = false;
      this.loadLeaveBalances();
    });
  }

  private loadPayrollRuns(): void {
    this.service.getPayrollRuns({ page: 0, size: 100 }).subscribe({
      next: (res) => {
        const all = res.data?.content ?? [];
        this.payrollRuns = this.filterPropertyId
          ? all.filter((run) => run.propertyId === this.filterPropertyId)
          : all;
      },
      error: () => { this.payrollRuns = []; }
    });
  }

  private loadDeductions(): void {
    this.loading = true;
    this.service.getDeductions({ page: 0, size: 100 }).subscribe({
      next: (res) => {
        this.deductions = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.deductions = [];
        this.loading = false;
      }
    });
  }

  private loadPayrollDetail(id: number): void {
    if (!id) {
      this.payrollDetail = null;
      return;
    }
    this.service.getPayrollRun(id).subscribe({
      next: (res) => { this.payrollDetail = res.data ?? null; },
      error: () => { this.payrollDetail = null; }
    });
  }

  openPayroll(id: number): void {
    void this.router.navigate(['/admin/hr/payroll', id]);
  }

  generateCurrentPayroll(): void {
    const now = new Date();
    const propertyId = this.filterPropertyId ?? this.properties[0]?.id;
    this.service.generatePayroll({
      propertyId,
      payPeriodYear: now.getFullYear(),
      payPeriodMonth: now.getMonth() + 1
    }).subscribe({
      next: (res) => {
        if (res.data?.id) {
          void this.router.navigate(['/admin/hr/payroll', res.data.id]);
        } else {
          this.loadPayrollRuns();
        }
      }
    });
  }

  markPayrollPaid(id: number): void {
    const today = new Date();
    this.service.markPayrollPaid(id, {
      paidDate: this.toYmd(today),
      paymentMethod: 'BANK_TRANSFER'
    }).subscribe({
      next: () => this.loadPayrollDetail(id)
    });
  }

  createDeduction(): void {
    const employeeId = Number(window.prompt(this.i18n.instant('HR.EMPLOYEE_ID')));
    if (!employeeId) return;
    const amount = Number(window.prompt(this.i18n.instant('HR.DEDUCTION_AMOUNT')));
    if (!amount || amount <= 0) {
      this.snack.error('HR.VALIDATION_DEDUCTION_AMOUNT');
      return;
    }
    const reason = (window.prompt(this.i18n.instant('HR.DEDUCTION_REASON')) || '').trim();
    if (!reason) return;
    const today = this.toYmd(new Date());
    const payrollMonth = window.prompt(this.i18n.instant('HR.PAYROLL_MONTH'), today.slice(0, 7)) || today.slice(0, 7);
    this.service.createDeduction({ employeeId, amount, reason, deductionDate: today, payrollMonth }).subscribe({
      next: () => {
        this.snack.success('HR.DEDUCTION_CREATED');
        this.loadDeductions();
      }
    });
  }

  sendDeduction(id: number): void {
    this.service.sendDeduction(id).subscribe({
      next: () => {
        this.snack.success('HR.DEDUCTION_SENT');
        this.loadDeductions();
      }
    });
  }

  approveDeduction(id: number): void {
    this.service.approveDeduction(id).subscribe({
      next: () => {
        this.snack.success('HR.DEDUCTION_APPROVED');
        this.loadDeductions();
      }
    });
  }

  rejectDeduction(id: number): void {
    this.service.rejectDeduction(id).subscribe({
      next: () => {
        this.snack.success('HR.DEDUCTION_REJECTED');
        this.loadDeductions();
      }
    });
  }

  allowancesTotal(slip: PayslipItem): number {
    return (slip.housingAllowance ?? 0) + (slip.transportAllowance ?? 0) + (slip.otherAllowances ?? 0);
  }

  private loadLeaveBalances(): void {
    if (!this.filterPropertyId) {
      this.leaveBalanceByEmployeeId.clear();
      return;
    }
    const params: Record<string, string | number> = { propertyId: this.filterPropertyId };
    this.service.getLeaveBalances(params).subscribe({
      next: (res) => {
        this.leaveBalanceByEmployeeId.clear();
        for (const item of (res.data ?? [])) {
          this.leaveBalanceByEmployeeId.set(item.employeeId, item);
        }
      },
      error: () => {
        this.leaveBalanceByEmployeeId.clear();
      }
    });
  }

  private reloadLeaves(): void {
    this.lookupCache.preload('LEAVE_TYPE', 'LEAVE_STATUS').subscribe({
      next: () => this.fetchLeaves(),
      error: () => this.fetchLeaves()
    });
  }

  private fetchLeaves(): void {
    this.service.getLeaveRequests({ page: 0, size: 50 }).subscribe({
      next: (res) => { this.leaveRequests = res.data?.content ?? []; this.leavePageIndex = 0; },
      error: () => { this.leaveRequests = []; this.leavePageIndex = 0; }
    });
  }

  approveLeave(id: number): void {
    this.service.approveLeave(id).subscribe({
      next: () => {
        this.reloadLeaves();
        this.loadLeaveBalances();
      }
    });
  }

  rejectLeave(id: number): void {
    this.service.rejectLeave(id).subscribe({
      next: () => {
        this.reloadLeaves();
        this.loadLeaveBalances();
      }
    });
  }

  leaveUsedDays(employeeId: number): number {
    return this.leaveBalanceByEmployeeId.get(employeeId)?.usedDays ?? 0;
  }

  leaveRemainingDays(employeeId: number): number {
    return this.leaveBalanceByEmployeeId.get(employeeId)?.remainingDays ?? 30;
  }

  employeeJobTitle(item: EmployeeItem): string {
    if (this.i18n.currentLang === 'ar') {
      return item.jobTitleAr ?? item.jobTitle ?? item.jobTitleEn ?? '-';
    }
    return item.jobTitleEn ?? item.jobTitle ?? item.jobTitleAr ?? '-';
  }

  leaveTypeLabel(item: LeaveRequestItem): string {
    const idCode = item.leaveTypeId != null ? String(item.leaveTypeId) : null;
    return this.lookupCache.label('LEAVE_TYPE', idCode)
      || this.lookupCache.cleanDisplayText(item.leaveTypeName)
      || '-';
  }

  leaveStatusLabel(status?: string | null): string {
    return this.lookupCache.label('LEAVE_STATUS', status || 'PENDING') || status || 'PENDING';
  }

  payrollStatusLabel(status?: string | null): string {
    return this.lookupCache.label('PAYROLL_STATUS', status || 'SUBMITTED') || status || 'SUBMITTED';
  }

  deductionStatusLabel(status?: string | null): string {
    return status ? this.i18n.instant(`HR.STATUS.${status}`) : '-';
  }

  employeeActive(item: EmployeeItem): boolean {
    return (item.status ?? 'ACTIVE') === 'ACTIVE';
  }

  employeeName(item: EmployeeItem): string {
    const ar = this.cleanDisplayName(item.fullNameAr);
    const en = this.cleanDisplayName(item.fullNameEn);
    const fallback = this.cleanDisplayName(item.fullName);
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || '-')
      : (en || ar || fallback || '-');
  }

  private matchesEmployeeFilters(employee: EmployeeItem, query: string): boolean {
    if (this.filterStatus && (employee.status ?? 'ACTIVE') !== this.filterStatus) return false;
    if (!query) return true;
    return this.employeeName(employee).toLowerCase().includes(query) ||
      this.employeeJobTitle(employee).toLowerCase().includes(query) ||
      (employee.email ?? '').toLowerCase().includes(query) ||
      (employee.phone ?? '').toLowerCase().includes(query) ||
      (employee.nationalId ?? '').toLowerCase().includes(query);
  }

  officerName(o: AllCompanyOfficer): string {
    const ar = this.cleanDisplayName(o.fullNameAr);
    const en = this.cleanDisplayName(o.fullNameEn);
    const fallback = this.cleanDisplayName(o.fullName);
    return this.i18n.currentLang === 'ar'
      ? (ar || en || fallback || o.email || '-')
      : (en || ar || fallback || o.email || '-');
  }

  officerCompanyName(o: AllCompanyOfficer): string {
    return this.i18n.currentLang === 'ar'
      ? (o.companyNameAr || o.companyNameEn || '-')
      : (o.companyNameEn || o.companyNameAr || '-');
  }

  officerPropertyName(o: AllCompanyOfficer): string {
    return this.i18n.currentLang === 'ar'
      ? (o.propertyNameAr || o.propertyNameEn || '-')
      : (o.propertyNameEn || o.propertyNameAr || '-');
  }

  get filteredOfficers(): AllCompanyOfficer[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.companyOfficers.filter(o => {
      if (!q) return true;
      return this.officerName(o).toLowerCase().includes(q) ||
        this.officerCompanyName(o).toLowerCase().includes(q) ||
        (o.email ?? '').toLowerCase().includes(q) ||
        (o.phone ?? '').toLowerCase().includes(q);
    });
  }

  private cleanDisplayName(value?: string | null): string {
    const normalized = (value ?? '').trim();
    if (!normalized || /^[?\s]+$/.test(normalized)) return '';
    return normalized;
  }

  private toYmd(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  removeEmployee(item: EmployeeItem): void {
    const ar = this.i18n.currentLang === 'ar';
    const name = this.employeeName(item);
    const hasUser = !!item.email;
    const baseLine = ar ? `هل تريد حذف الموظف "${name}"؟` : `Delete employee "${name}"?`;
    const userLine = hasUser
      ? (this.i18n.instant('INLINE_TEXT.THIS_WILL_ALSO_DELETE_THE_LINKED_USER_ACCOUNT_2'))
      : '';
    this.deleteConfirm.openDeleteConfirm({
      message: [baseLine, userLine].filter(Boolean).join('\n')
    }).subscribe((ok) => {
      if (!ok) return;
      this.service.deleteEmployee(item.id).subscribe({
        next: () => {
          this.snack.success(this.i18n.instant('HR.DELETE_SUCCESS'));
          this.loadEmployees();
        },
        error: (err: Error) => this.deleteConfirm.handleDeleteError(err, this.snack)
      });
    });
  }

}
