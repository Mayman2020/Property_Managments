import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { LeaseContract } from '../models/contract.model';
import { RentReceipt } from './tenant-portal.service';

export interface ReceiptWithTenant extends RentReceipt {
  tenantName?: string;
  tenantPhone?: string;
  unitId?: number;
}

export interface RenewalRequestWithDetails {
  id: number;
  tenantId: number;
  tenantName?: string;
  contractId: number;
  contractNumber?: string;
  currentMonthlyRent?: number;
  currentEndDate?: string;
  requestedDate?: string;
  reason?: string;
  notes?: string;
  attachmentUrl?: string;
  status: string;
  createdAt: string;
}

export interface ReviewReceiptPayload {
  status: 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface ProcessRenewalPayload {
  newStartDate: string;
  newEndDate: string;
  newMonthlyRent: number;
  freeMonths?: number;
  newSecurityDeposit?: number;
  contractPdfUrl?: string;
  notes?: string;
}

export interface OwnerApprovalDecision {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountantPortalService {
  constructor(private readonly api: ApiService) {}

  getReceipts(year?: number, month?: number): Observable<ApiResponse<ReceiptWithTenant[]>> {
    const params: Record<string, string> = {};
    if (year != null) params['year'] = String(year);
    if (month != null) params['month'] = String(month);
    return this.api.get('/accountant-portal/receipts', params);
  }

  reviewReceipt(id: number, status: string, notes?: string): Observable<ApiResponse<RentReceipt>> {
    return this.api.patch(`/accountant-portal/receipts/${id}/review`, { status, notes });
  }

  getPendingRenewalRequests(): Observable<ApiResponse<RenewalRequestWithDetails[]>> {
    return this.api.get('/accountant-portal/renewal-requests');
  }

  processRenewal(requestId: number, payload: ProcessRenewalPayload): Observable<ApiResponse<LeaseContract>> {
    return this.api.post(`/accountant-portal/renewal-requests/${requestId}/process`, payload);
  }

  // Owner portal
  getPendingApprovals(ownerId?: number): Observable<ApiResponse<LeaseContract[]>> {
    const params: Record<string, string> = {};
    if (ownerId != null) params['ownerId'] = String(ownerId);
    return this.api.get('/owner-portal/pending-approvals', params);
  }

  submitOwnerDecision(contractId: number, payload: OwnerApprovalDecision): Observable<ApiResponse<LeaseContract>> {
    return this.api.post(`/owner-portal/contracts/${contractId}/decision`, payload);
  }
}
