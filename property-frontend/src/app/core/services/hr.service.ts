import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface EmployeeItem {
  id: number;
  propertyId?: number;
  employeeCode: string;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  phone?: string;
  email?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  jobTitleEn?: string;
  basicSalary?: number;
  totalSalary?: number;
  status?: string;
  hireDate?: string;
}

export interface EmployeePayload {
  propertyId?: number;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  phone?: string;
  email?: string;
  jobTitleAr?: string;
  jobTitleEn?: string;
  basicSalary: number;
  hireDate: string;
  systemRole?: string;
}

export interface PayrollRunItem {
  id: number;
  propertyId?: number;
  payPeriodYear: number;
  payPeriodMonth: number;
  payDate?: string;
  status?: string;
  totalBasic?: number;
  totalAllowances?: number;
  totalDeductions?: number;
  totalBonuses?: number;
  totalNet?: number;
}

export interface PayslipItem {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  jobTitle?: string;
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
  overtimeAmount?: number;
  bonusAmount?: number;
  totalEarnings?: number;
  advanceDeduction?: number;
  absenceDeduction?: number;
  lateDeduction?: number;
  penaltyDeduction?: number;
  insuranceDeduction?: number;
  otherDeductions?: number;
  totalDeductions?: number;
  netSalary?: number;
  paid?: boolean;
  paidDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface PayrollRunDetail extends PayrollRunItem {
  notes?: string;
  payslips: PayslipItem[];
}

export interface GeneratePayrollPayload {
  propertyId?: number;
  payPeriodYear: number;
  payPeriodMonth: number;
}

export interface SalaryAdvancePayload {
  employeeId: number;
  amount: number;
  requestDate: string;
  deductedYear: number;
  deductedMonth: number;
  reason?: string;
  notes?: string;
}

export interface BonusPayload {
  employeeId: number;
  bonusType: string;
  amount: number;
  reason?: string;
}

export interface PayslipAdjustPayload {
  overtimeAmount?: number;
  absenceDeduction?: number;
  lateDeduction?: number;
  penaltyDeduction?: number;
  insuranceDeduction?: number;
  otherDeductions?: number;
  notes?: string;
}

export interface PayrollMarkPaidPayload {
  paidDate: string;
  paymentMethod: string;
  referenceNumber?: string;
}

export interface LeaveRequestItem {
  id: number;
  employeeId?: number;
  leaveTypeId?: number;
  employeeName?: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status?: string;
  reason?: string;
  rejectionReason?: string;
}

export interface LeaveBalanceItem {
  employeeId: number;
  year: number;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface CreateLeavePayload {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  attachmentUrl?: string;
}

export interface AttendanceItem {
  id: number;
  employeeName?: string;
  attendanceDate: string;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  lateMinutes?: number;
}

@Injectable({ providedIn: 'root' })
export class HrService {
  constructor(private readonly api: ApiService) {}

  getEmployees(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<EmployeeItem>>> {
    return this.api.get(AppConstants.API.HR_EMPLOYEES, params);
  }

  getEmployee(id: number): Observable<ApiResponse<EmployeeItem>> {
    return this.api.get(AppConstants.API.HR_EMPLOYEE_BY_ID(id));
  }

  createEmployee(payload: EmployeePayload): Observable<ApiResponse<EmployeeItem>> {
    return this.api.post(AppConstants.API.HR_EMPLOYEES, payload);
  }

  updateEmployee(id: number, payload: EmployeePayload): Observable<ApiResponse<EmployeeItem>> {
    return this.api.put(AppConstants.API.HR_EMPLOYEE_BY_ID(id), payload);
  }

  deleteEmployee(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(AppConstants.API.HR_EMPLOYEE_BY_ID(id));
  }

  getPayrollRuns(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<PayrollRunItem>>> {
    return this.api.get(AppConstants.API.HR_PAYROLL, params);
  }

  getPayrollRun(id: number): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.get(AppConstants.API.HR_PAYROLL_BY_ID(id));
  }

  generatePayroll(payload: GeneratePayrollPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(AppConstants.API.HR_PAYROLL_GENERATE, payload);
  }

  createSalaryAdvance(payload: SalaryAdvancePayload): Observable<ApiResponse<number>> {
    return this.api.post(AppConstants.API.HR_PAYROLL_ADVANCES, payload);
  }

  addBonus(payrollId: number, payload: BonusPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(AppConstants.API.HR_PAYROLL_BONUSES(payrollId), payload);
  }

  updatePayslip(payrollId: number, payslipId: number, payload: PayslipAdjustPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.patch(AppConstants.API.HR_PAYROLL_PAYSLIP(payrollId, payslipId), payload);
  }

  approvePayroll(payrollId: number): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(AppConstants.API.HR_PAYROLL_APPROVE(payrollId), {});
  }

  markPayrollPaid(payrollId: number, payload: PayrollMarkPaidPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(AppConstants.API.HR_PAYROLL_MARK_PAID(payrollId), payload);
  }

  rejectPayroll(payrollId: number, reason?: string): Observable<ApiResponse<PayrollRunDetail>> {
    const url = AppConstants.API.HR_PAYROLL_REJECT(payrollId) + (reason ? `?reason=${encodeURIComponent(reason)}` : '');
    return this.api.post(url, {});
  }

  getMyPayslips(): Observable<ApiResponse<PayslipItem[]>> {
    return this.api.get(AppConstants.API.HR_MY_PAYSLIPS);
  }

  getMyPayslipById(id: number): Observable<ApiResponse<PayslipItem>> {
    return this.api.get(AppConstants.API.HR_MY_PAYSLIP_BY_ID(id));
  }

  getLeaveRequests(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<LeaveRequestItem>>> {
    return this.api.get(AppConstants.API.HR_LEAVES, params);
  }

  getLeaveBalances(params: Record<string, string | number> = {}): Observable<ApiResponse<LeaveBalanceItem[]>> {
    return this.api.get(AppConstants.API.HR_LEAVES_BALANCES, params);
  }

  createLeave(payload: CreateLeavePayload): Observable<ApiResponse<LeaveRequestItem>> {
    return this.api.post(AppConstants.API.HR_LEAVES, payload);
  }

  approveLeave(id: number, note?: string): Observable<ApiResponse<LeaveRequestItem>> {
    return this.api.post(AppConstants.API.HR_LEAVE_APPROVE(id), { note });
  }

  rejectLeave(id: number, note?: string): Observable<ApiResponse<LeaveRequestItem>> {
    return this.api.post(AppConstants.API.HR_LEAVE_REJECT(id), { note });
  }

  getAttendance(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<AttendanceItem>>> {
    return this.api.get(AppConstants.API.HR_ATTENDANCE, params);
  }
}
