import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  LeaseContract, ContractSummary, ContractTemplate,
  CreateContractRequest, RenewContractRequest, TerminateContractRequest,
  RentPaymentSchedule
} from '../models/contract.model';

@Injectable({ providedIn: 'root' })
export class ContractService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>('/contracts', params);
  }

  getById(id: number): Observable<any> {
    return this.api.get<any>(`/contracts/${id}`);
  }

  getByTenant(tenantId: number): Observable<any> {
    return this.api.get<any>(`/contracts/tenant/${tenantId}`);
  }

  getExpiring(days = 30): Observable<any> {
    return this.api.get<any>('/contracts/expiring', { days });
  }

  create(body: CreateContractRequest): Observable<any> {
    return this.api.post<any>('/contracts', body);
  }

  update(id: number, body: CreateContractRequest): Observable<any> {
    return this.api.put<any>(`/contracts/${id}`, body);
  }

  activate(id: number): Observable<any> {
    return this.api.patch<any>(`/contracts/${id}/activate`);
  }

  terminate(id: number, body: TerminateContractRequest): Observable<any> {
    return this.api.patch<any>(`/contracts/${id}/terminate`, body);
  }

  renew(id: number, body: RenewContractRequest): Observable<any> {
    return this.api.post<any>(`/contracts/${id}/renew`, body);
  }

  getPaymentSchedule(contractId: number): Observable<any> {
    return this.api.get<any>(`/contracts/${contractId}/payment-schedule`);
  }

  getTemplates(): Observable<any> {
    return this.api.get<any>('/contract-templates/active');
  }

  getAllTemplates(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>('/contract-templates', params);
  }

  createTemplate(body: Partial<ContractTemplate>): Observable<any> {
    return this.api.post<any>('/contract-templates', body);
  }

  updateTemplate(id: number, body: Partial<ContractTemplate>): Observable<any> {
    return this.api.put<any>(`/contract-templates/${id}`, body);
  }
}
