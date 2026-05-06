import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { RecordPaymentRequest, RentPaymentSchedule } from '../models/contract.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>('/payments', params);
  }

  getByContract(contractId: number): Observable<any> {
    return this.api.get<any>(`/payments/contract/${contractId}`);
  }

  getOverdue(): Observable<any> {
    return this.api.get<any>('/payments/overdue');
  }

  recordPayment(body: RecordPaymentRequest): Observable<any> {
    return this.api.post<any>('/payments', body);
  }

  getPendingProofs(): Observable<ApiResponse<RentPaymentSchedule[]>> {
    return this.api.get<ApiResponse<RentPaymentSchedule[]>>('/payments/proofs/pending');
  }

  reviewProof(scheduleId: number, status: 'APPROVED' | 'REJECTED', notes?: string): Observable<ApiResponse<RentPaymentSchedule>> {
    return this.api.patch<ApiResponse<RentPaymentSchedule>>(`/payment-schedule/${scheduleId}/proof/review`, { status, notes });
  }

  markSchedulePaid(scheduleId: number, body: Partial<RecordPaymentRequest>): Observable<ApiResponse<RentPaymentSchedule>> {
    return this.api.post<ApiResponse<RentPaymentSchedule>>(`/payment-schedule/${scheduleId}/mark-paid`, body);
  }

  getFeesByContract(contractId: number): Observable<any> {
    return this.api.get<any>(`/contract-fees/contract/${contractId}`);
  }

  addFee(body: any): Observable<any> {
    return this.api.post<any>('/contract-fees', body);
  }
}
