import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FilterBarComponent, FilterSpec } from '../../shared/components/filter-bar/filter-bar.component';
import {
  EmployeeItem,
  HrService, LeaveBalanceItem, LeaveRequestItem
} from '../../core/services/hr.service';
import { Property, PropertyService } from '../../core/services/property.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmployeeDialogComponent } from './employee-dialog.component';

@Component({
  selector: 'app-hr-workspace',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
    MatButtonModule,
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
                <th>{{ 'HR.HIRE_DATE_COL' | translate }}</th>
                <th>{{ 'HR.SALARY_COL' | translate }}</th>
                <th>{{ 'HR.LEAVE_USED_COL' | translate }}</th>
                <th>{{ 'HR.LEAVE_REMAINING_COL' | translate }}</th>
                <th>{{ 'HR.EMAIL_COL' | translate }}</th>
                <th>{{ 'HR.STATUS_COL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of employees">
                <td>#{{ item.id }}</td>
                <td>{{ item.fullName }}</td>
                <td>{{ employeeJobTitle(item) }}</td>
                <td>{{ item.hireDate || '-' }}</td>
                <td>{{ item.basicSalary || '-' }}</td>
                <td>{{ leaveUsedDays(item.id) }}</td>
                <td>{{ leaveRemainingDays(item.id) }}</td>
                <td>{{ item.email }}</td>
                <td><span class="status-badge" [attr.data-status]="item.status || 'ACTIVE'">{{ item.status || ('COMMON.ACTIVE' | translate) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
                <th>{{ 'COMMON.ACTIONS' | translate }}</th>
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
                <td class="actions-cell">
                  <button mat-stroked-button *ngIf="item.status === 'PENDING'" (click)="approveLeave(item.id)">{{ 'ACTIONS.APPROVE' | translate }}</button>
                  <button mat-stroked-button *ngIf="item.status === 'PENDING'" (click)="rejectLeave(item.id)">{{ 'ACTIONS.REJECT' | translate }}</button>
                </td>
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
    .actions-cell {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    @media (max-width: 1000px) {
    }
    @media (max-width: 800px) {
    }
  `]
})
export class HrWorkspaceComponent implements OnInit {
  section = 'employees-list';
  employees: EmployeeItem[] = [];
  properties: Property[] = [];
  filterPropertyId: number | null = null;
  pageFilters: FilterSpec[] = [];
  leaveRequests: LeaveRequestItem[] = [];
  leaveBalanceByEmployeeId = new Map<number, LeaveBalanceItem>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: HrService,
    private readonly propertySvc: PropertyService,
    private readonly dialog: MatDialog,
    private readonly translate: TranslateService,
    readonly i18n: I18nService
  ) {}

  get title(): string {
    const map: Record<string, string> = {
      'employees-list': 'HR.EMPLOYEES_TITLE',
      'employee-form': 'HR.NEW_EMPLOYEE_TITLE',
      'employee-detail': 'HR.EMPLOYEE_DETAIL_TITLE',
      leaves: 'HR.LEAVES_TITLE',
      attendance: 'HR.ATTENDANCE_TITLE'
    };
    return this.translate.instant(map[this.section] ?? 'HR.EMPLOYEES_TITLE');
  }

  employeeJobTitle(item: EmployeeItem): string {
    return item.jobTitle || item.jobTitleAr || item.jobTitleEn || '-';
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'employees-list';

    if (this.section.startsWith('employee')) {
      this.propertySvc.getAll(0, 500).subscribe({ next: (res) => { this.properties = res.data?.content ?? []; this.setupFilters(); }, error: () => {} });
      this.loadEmployees();
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
    this.loadLeaveBalances();
  }

  private loadEmployees(): void {
    const params: Record<string, string | number> = { page: 0, size: 200 };
    if (this.filterPropertyId) {
      params['propertyId'] = this.filterPropertyId;
    }
    this.service.getEmployees(params).subscribe({
      next: (res) => {
        this.employees = res.data?.content ?? [];
        this.loadLeaveBalances();
      },
      error: () => { this.employees = []; }
    });
  }

  private loadLeaveBalances(): void {
    const params: Record<string, string | number> = {};
    if (this.filterPropertyId) {
      params['propertyId'] = this.filterPropertyId;
    }
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
    this.service.getLeaveRequests({ page: 0, size: 50 }).subscribe({
      next: (res) => { this.leaveRequests = res.data?.content ?? []; },
      error: () => { this.leaveRequests = []; }
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

}
