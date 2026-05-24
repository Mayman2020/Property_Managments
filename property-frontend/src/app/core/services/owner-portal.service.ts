import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
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
  ownershipPercentage?: number;
  status?: string;
  pdfUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class OwnerPortalService {
  constructor(private readonly api: ApiService) {}

  getDashboard(): Observable<ApiResponse<OwnerDashboardDto>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_DASHBOARD);
  }

  getStatements(): Observable<ApiResponse<OwnerStatementItem[]>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_STATEMENTS);
  }

  getProperties(): Observable<ApiResponse<OwnerPropertyItem[]>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_PROPERTIES);
  }

  getDraftContracts(): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_DRAFT_CONTRACTS);
  }

  getDraftAmendUnitOptions(contractId: number): Observable<ApiResponse<DraftUnitOption[]>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_DRAFT_CONTRACT_UNIT_OPTIONS(contractId));
  }

  rejectDraftContract(id: number, reason: string): Observable<ApiResponse<LeaseContract>> {
    return this.api.patch(AppConstants.API.OWNER_PORTAL_DRAFT_CONTRACT_REJECT(id), { reason });
  }

  amendDraftContract(
    id: number,
    body: { unitId?: number; monthlyRent?: number; reason: string }
  ): Observable<ApiResponse<LeaseContract>> {
    return this.api.patch(AppConstants.API.OWNER_PORTAL_DRAFT_CONTRACT_AMEND(id), body);
  }

  getPendingTerminations(ownerId?: number): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_PENDING_TERMINATIONS,
      ownerId != null ? { ownerId } : undefined);
  }

  decideTermination(
    contractId: number,
    body: { decision: 'APPROVED' | 'REJECTED'; notes?: string }
  ): Observable<ApiResponse<LeaseContract>> {
    return this.api.post(AppConstants.API.OWNER_PORTAL_CONTRACT_TERMINATION_DECISION(contractId), body);
  }

  getPendingRenewals(ownerId?: number): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get(AppConstants.API.OWNER_PORTAL_PENDING_RENEWALS,
      ownerId != null ? { ownerId } : undefined);
  }

  decideRenewal(
    contractId: number,
    body: { decision: 'APPROVED' | 'REJECTED'; notes?: string }
  ): Observable<ApiResponse<LeaseContract>> {
    return this.api.post(AppConstants.API.OWNER_PORTAL_CONTRACT_RENEWAL_DECISION(contractId), body);
  }
}
