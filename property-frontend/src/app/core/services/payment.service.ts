import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { RecordPaymentRequest, RentPaymentSchedule } from '../models/contract.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>(AppConstants.API.PAYMENTS, params);
  }

  getByContract(contractId: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.PAYMENTS_BY_CONTRACT(contractId));
  }

  getOverdue(params?: Record<string, string | number>): Observable<any> {
    return this.api.get<any>(AppConstants.API.PAYMENTS_OVERDUE, params);
  }

  recordPayment(body: RecordPaymentRequest): Observable<any> {
    return this.api.post<any>(AppConstants.API.PAYMENTS, body);
  }

  getPendingProofs(): Observable<ApiResponse<RentPaymentSchedule[]>> {
    return this.api.get<ApiResponse<RentPaymentSchedule[]>>(AppConstants.API.PAYMENTS_PROOFS_PENDING);
  }

  reviewProof(scheduleId: number, status: 'APPROVED' | 'REJECTED', notes?: string): Observable<ApiResponse<RentPaymentSchedule>> {
    return this.api.patch<ApiResponse<RentPaymentSchedule>>(AppConstants.API.PAYMENT_SCHEDULE_PROOF_REVIEW(scheduleId), { status, notes });
  }

  markSchedulePaid(scheduleId: number, body: Partial<RecordPaymentRequest>): Observable<ApiResponse<RentPaymentSchedule>> {
    return this.api.post<ApiResponse<RentPaymentSchedule>>(AppConstants.API.PAYMENT_SCHEDULE_MARK_PAID(scheduleId), body);
  }

  sendOverdueReminder(scheduleId: number): Observable<ApiResponse<RentPaymentSchedule>> {
    return this.api.post<ApiResponse<RentPaymentSchedule>>(AppConstants.API.PAYMENT_SCHEDULE_OVERDUE_REMINDER(scheduleId), {});
  }

  getFeesByContract(contractId: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACT_FEES_BY_CONTRACT(contractId));
  }

  addFee(body: any): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_FEES, body);
  }
}
