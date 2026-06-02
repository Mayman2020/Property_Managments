import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { withPageParams } from '../utils/pagination.util';

export interface MaintenanceContractResponse {
  contractId: number;
  propertyId: number;
  contractorCompanyId: number;
  contractorCompanyName: string | null;
  contractorCompanyNameAr: string | null;
  contractorCompanyNameEn: string | null;
  propertyCode?: string | null;
  propertyName?: string | null;
  propertyNameAr?: string | null;
  propertyNameEn?: string | null;
  assignmentId: number | null;
  contractNumber: string;
  startDate: string;
  endDate: string | null;
  slaHours: number | null;
  contractValue: number | null;
  currency?: string | null;
  status: string;
  notes: string | null;
  staffChangeLog?: string | null;
  createdAt: string;
  invoiceCount: number;
  previousContractId?: number | null;
  ownerApprovalStatus?: string | null;
  ownerApprovalNotes?: string | null;
  terminationRequestedBy?: number | null;
  terminationRequestedByName?: string | null;
  terminationRequestedAt?: string | null;
  terminationProposedDate?: string | null;
  terminationRequestNotes?: string | null;
  renewalRequestedBy?: number | null;
  renewalRequestedByName?: string | null;
  renewalRequestedAt?: string | null;
  renewalProposedStartDate?: string | null;
  renewalProposedEndDate?: string | null;
  renewalProposedValue?: number | null;
  renewalRequestedNote?: string | null;
  renewalDecisionStatus?: string | null;
  propertyTotalUnits?: number | null;
  propertyVacantUnits?: number | null;
  propertyNonVacantUnits?: number | null;
  otherActiveMaintenanceContractsForProperty?: number | null;
  propertyWillBeWithoutMaintenanceAfterTermination?: boolean | null;
  attachmentUrls?: string | null;
  updatedAt?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  modifiedBy?: number | null;
  modifiedByName?: string | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  settlementAmount?: number | null;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceContractService {
  constructor(private readonly api: ApiService) {}

  getAll(
    page = 0,
    size = 20,
    status?: string,
    ownerApprovalStatus?: string,
    q?: string
  ): Observable<ApiResponse<PagedResponse<MaintenanceContractResponse>>> {
    return this.api.get<ApiResponse<PagedResponse<MaintenanceContractResponse>>>(
      AppConstants.API.MAINTENANCE_CONTRACTS,
      withPageParams(page, size, {
        status: status || undefined,
        ownerApprovalStatus: ownerApprovalStatus || undefined,
        q: q?.trim() || undefined
      })
    );
  }

  listAll(): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.getAll(0, 500).pipe(
      map((res) => ({
        ...res,
        data: res.data?.content ?? []
      }))
    );
  }

  create(payload: Record<string, unknown>): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACTS, payload);
  }

  update(id: number, payload: Record<string, unknown>): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.put<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACT_BY_ID(id), payload);
  }

  getById(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACT_BY_ID(id));
  }

  listByProperty(propertyId: number): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(
      AppConstants.API.PROPERTY_MAINTENANCE_CONTRACTS(propertyId)
    );
  }

  listByCompany(companyId: number): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(
      AppConstants.API.MAINTENANCE_CONTRACTS_BY_COMPANY(companyId)
    );
  }

  activate(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.MAINTENANCE_CONTRACT_ACTIVATE(id)
    );
  }

  terminate(id: number, body?: { terminationDate?: string; reason?: string }): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.MAINTENANCE_CONTRACT_TERMINATE(id),
      body
    );
  }

  cancelDraft(id: number, notes?: string): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACT_CANCEL(id), { notes });
  }

  cancelTerminationRequest(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACT_CANCEL_TERMINATION_REQUEST(id));
  }

  requestRenewal(id: number, body: { proposedStartDate: string; proposedEndDate: string; proposedValue?: number; note?: string }): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACT_REQUEST_RENEWAL(id), body);
  }

  cancelRenewalRequest(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(AppConstants.API.MAINTENANCE_CONTRACT_CANCEL_RENEWAL_REQUEST(id));
  }

  getOwnerDrafts(): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(AppConstants.API.OWNER_PORTAL_MAINTENANCE_CONTRACT_DRAFTS);
  }

  getOwnerPendingTerminations(): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(AppConstants.API.OWNER_PORTAL_MAINTENANCE_CONTRACT_PENDING_TERMINATIONS);
  }

  getOwnerPendingRenewals(): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(AppConstants.API.OWNER_PORTAL_MAINTENANCE_CONTRACT_PENDING_RENEWALS);
  }

  decideDraft(id: number, decision: 'APPROVED' | 'REJECTED', notes?: string): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.OWNER_PORTAL_MAINTENANCE_CONTRACT_DECISION(id),
      { decision, notes }
    );
  }

  decideTermination(id: number, decision: 'APPROVED' | 'REJECTED', notes?: string): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.OWNER_PORTAL_MAINTENANCE_CONTRACT_TERMINATION_DECISION(id),
      { decision, notes }
    );
  }

  decideRenewal(id: number, decision: 'APPROVED' | 'REJECTED', notes?: string): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.OWNER_PORTAL_MAINTENANCE_CONTRACT_RENEWAL_DECISION(id),
      { decision, notes }
    );
  }

  staffDecideTermination(id: number, decision: 'APPROVED' | 'REJECTED', notes?: string, settlementAmount?: number | null): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.MAINTENANCE_CONTRACT_TERMINATION_DECISION(id),
      { decision, notes, settlementAmount: settlementAmount ?? null }
    );
  }

  staffDecideRenewal(id: number, decision: 'APPROVED' | 'REJECTED', notes?: string): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.post<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.MAINTENANCE_CONTRACT_RENEWAL_DECISION(id),
      { decision, notes }
    );
  }
}
