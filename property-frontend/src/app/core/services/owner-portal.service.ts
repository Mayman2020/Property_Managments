import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { LeaseContract } from '../models/contract.model';

export interface OwnerDashboardDto {
  totalProperties: number;
  totalRevenue: number;
  totalExpenses: number;
  ownerNetAmount: number;
}

export interface OwnerPropertyItem {
  id: number;
  propertyName: string;
  propertyCode?: string;
  totalUnits?: number;
  occupiedUnits?: number;
}

export interface DraftUnitOption {
  id: number;
  unitNumber: string;
  propertyId: number;
  propertyName?: string;
}

export interface OwnerStatementItem {
  id: number;
  propertyName?: string;
  statementMonth: number;
  statementYear: number;
  totalRevenue: number;
  totalExpenses: number;
  ownerNetAmount: number;
  status?: string;
  pdfUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class OwnerPortalService {
  constructor(private readonly api: ApiService) {}

  getDashboard(): Observable<ApiResponse<OwnerDashboardDto>> {
    return this.api.get('/owner-portal/dashboard');
  }

  getStatements(): Observable<ApiResponse<OwnerStatementItem[]>> {
    return this.api.get('/owner-portal/statements');
  }

  getProperties(): Observable<ApiResponse<OwnerPropertyItem[]>> {
    return this.api.get('/owner-portal/properties');
  }

  getDraftContracts(): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get('/owner-portal/draft-contracts');
  }

  getDraftAmendUnitOptions(contractId: number): Observable<ApiResponse<DraftUnitOption[]>> {
    return this.api.get(`/owner-portal/draft-contracts/${contractId}/unit-options`);
  }

  rejectDraftContract(id: number, reason: string): Observable<ApiResponse<LeaseContract>> {
    return this.api.patch(`/owner-portal/draft-contracts/${id}/reject`, { reason });
  }

  amendDraftContract(
    id: number,
    body: { unitId?: number; monthlyRent?: number; reason: string }
  ): Observable<ApiResponse<LeaseContract>> {
    return this.api.patch(`/owner-portal/draft-contracts/${id}/amend`, body);
  }

  getPendingTerminations(ownerId?: number): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get('/owner-portal/pending-terminations',
      ownerId != null ? { ownerId } : undefined);
  }

  decideTermination(
    contractId: number,
    body: { decision: 'APPROVED' | 'REJECTED'; notes?: string }
  ): Observable<ApiResponse<LeaseContract>> {
    return this.api.post(`/owner-portal/contracts/${contractId}/termination-decision`, body);
  }

  getPendingRenewals(ownerId?: number): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get('/owner-portal/pending-renewals',
      ownerId != null ? { ownerId } : undefined);
  }

  decideRenewal(
    contractId: number,
    body: { decision: 'APPROVED' | 'REJECTED'; notes?: string }
  ): Observable<ApiResponse<LeaseContract>> {
    return this.api.post(`/owner-portal/contracts/${contractId}/renewal-decision`, body);
  }
}
