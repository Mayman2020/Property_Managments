import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import {
  LeaseContract, ContractSummary, ContractTemplate,
  CreateContractRequest, RenewContractRequest, ContractRenewalRequest, TerminateContractRequest,
  RentPaymentSchedule, ContractRenewalContext
} from '../models/contract.model';

@Injectable({ providedIn: 'root' })
export class ContractService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACTS, params);
  }

  getById(id: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACT_BY_ID(id));
  }

  getRenewalContext(id: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACT_RENEWAL_CONTEXT(id));
  }

  getByTenant(tenantId: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACTS_BY_TENANT(tenantId));
  }

  getExpiring(days = 30): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACTS_EXPIRING, { days });
  }

  create(body: CreateContractRequest): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACTS, body);
  }

  update(id: number, body: CreateContractRequest): Observable<any> {
    return this.api.put<any>(AppConstants.API.CONTRACT_BY_ID(id), body);
  }

  activate(id: number): Observable<any> {
    return this.api.patch<any>(AppConstants.API.CONTRACT_ACTIVATE(id));
  }

  cancelDraft(id: number, reason?: string): Observable<any> {
    return this.api.patch<any>(AppConstants.API.CONTRACT_CANCEL(id), reason != null && reason !== '' ? { reason } : {});
  }

  terminate(id: number, body: TerminateContractRequest): Observable<any> {
    return this.api.patch<any>(AppConstants.API.CONTRACT_TERMINATE(id), body);
  }

  cancelTerminationRequest(id: number): Observable<any> {
    return this.api.patch<any>(AppConstants.API.CONTRACT_CANCEL_TERMINATION_REQUEST(id));
  }

  renew(id: number, body: RenewContractRequest): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_RENEW(id), body);
  }

  requestRenewal(id: number, body: ContractRenewalRequest): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_REQUEST_RENEWAL(id), body);
  }

  cancelRenewalRequest(id: number): Observable<any> {
    return this.api.patch<any>(AppConstants.API.CONTRACT_CANCEL_RENEWAL_REQUEST(id));
  }

  noRenewalIntent(id: number, notes?: string): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_NO_RENEWAL_INTENT(id), { notes: notes ?? '' });
  }

  returnDeposit(id: number): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_RETURN_DEPOSIT(id), {});
  }

  reportDamages(id: number, amount: number, notes: string): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_REPORT_DAMAGES(id), { amount, notes });
  }

  submitDamageReceipt(id: number, receiptUrl: string): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_SUBMIT_DAMAGE_RECEIPT(id), { receiptUrl });
  }

  confirmDamagePayment(id: number, receiptUrl?: string): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_CONFIRM_DAMAGE_PAYMENT(id), { receiptUrl: receiptUrl ?? null });
  }

  clearUnit(id: number): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_CLEAR_UNIT(id), {});
  }

  /** Loads schedule rows (server caps page size; request enough for multi-year leases). */
  getPaymentSchedule(contractId: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACT_PAYMENT_SCHEDULE(contractId), {
      page: 0,
      size: 500,
      sort: 'dueDate,asc'
    });
  }

  getTemplates(): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACT_TEMPLATES_ACTIVE);
  }

  getAllTemplates(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>(AppConstants.API.CONTRACT_TEMPLATES, params);
  }

  createTemplate(body: Partial<ContractTemplate>): Observable<any> {
    return this.api.post<any>(AppConstants.API.CONTRACT_TEMPLATES, body);
  }

  updateTemplate(id: number, body: Partial<ContractTemplate>): Observable<any> {
    return this.api.put<any>(AppConstants.API.CONTRACT_TEMPLATE_BY_ID(id), body);
  }
}
