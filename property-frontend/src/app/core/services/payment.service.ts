import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { RecordPaymentRequest } from '../models/contract.model';

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

  getFeesByContract(contractId: number): Observable<any> {
    return this.api.get<any>(`/contract-fees/contract/${contractId}`);
  }

  addFee(body: any): Observable<any> {
    return this.api.post<any>('/contract-fees', body);
  }
}
