import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface EmployeeItem {
  id: number;
  propertyId?: number;
  employeeCode: string;
  fullName: string;
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
    return this.api.get('/hr/employees', params);
  }

  getEmployee(id: number): Observable<ApiResponse<EmployeeItem>> {
    return this.api.get(`/hr/employees/${id}`);
  }

  createEmployee(payload: EmployeePayload): Observable<ApiResponse<EmployeeItem>> {
    return this.api.post('/hr/employees', payload);
  }

  getPayrollRuns(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<PayrollRunItem>>> {
    return this.api.get('/hr/payroll', params);
  }

  getPayrollRun(id: number): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.get(`/hr/payroll/${id}`);
  }

  generatePayroll(payload: GeneratePayrollPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post('/hr/payroll/generate', payload);
  }

  createSalaryAdvance(payload: SalaryAdvancePayload): Observable<ApiResponse<number>> {
    return this.api.post('/hr/payroll/advances', payload);
  }

  addBonus(payrollId: number, payload: BonusPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(`/hr/payroll/${payrollId}/bonuses`, payload);
  }

  updatePayslip(payrollId: number, payslipId: number, payload: PayslipAdjustPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.patch(`/hr/payroll/${payrollId}/payslips/${payslipId}`, payload);
  }

  approvePayroll(payrollId: number): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(`/hr/payroll/${payrollId}/approve`, {});
  }

  markPayrollPaid(payrollId: number, payload: PayrollMarkPaidPayload): Observable<ApiResponse<PayrollRunDetail>> {
    return this.api.post(`/hr/payroll/${payrollId}/mark-paid`, payload);
  }

  getLeaveRequests(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<LeaveRequestItem>>> {
    return this.api.get('/hr/leaves', params);
  }

  getLeaveBalances(params: Record<string, string | number> = {}): Observable<ApiResponse<LeaveBalanceItem[]>> {
    return this.api.get('/hr/leaves/balances', params);
  }

  createLeave(payload: CreateLeavePayload): Observable<ApiResponse<LeaveRequestItem>> {
    return this.api.post('/hr/leaves', payload);
  }

  approveLeave(id: number, note?: string): Observable<ApiResponse<LeaveRequestItem>> {
    return this.api.post(`/hr/leaves/${id}/approve`, { note });
  }

  rejectLeave(id: number, note?: string): Observable<ApiResponse<LeaveRequestItem>> {
    return this.api.post(`/hr/leaves/${id}/reject`, { note });
  }

  getAttendance(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<AttendanceItem>>> {
    return this.api.get('/hr/attendance', params);
  }
}
