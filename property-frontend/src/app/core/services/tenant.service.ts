import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface Tenant {
  id: number;
  userId?: number;
  /** True when linked users row is active (can sign in). */
  linkedUserActive?: boolean;
  unitId?: number;
  propertyId?: number;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  phone: string;
  email?: string;
  leaseStart?: string;
  leaseEnd?: string;
  profileImage?: string;
  leaseContractFiles?: string[];
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface TenantRequest {
  fullName: string;
  fullNameAr: string;
  fullNameEn: string;
  unitId?: number;
  propertyId?: number;
  userId?: number;
  nationalId?: string;
  phone: string;
  email?: string;
  leaseStart: string;
  leaseEnd: string;
  profileImage?: string;
  civilIdImageUrl?: string;
  leaseContractFiles: string[];
  notes?: string;
}

/** Matches backend {@code TenantFullOnboardRequest} — single atomic create (user + tenant + draft contract + unit rented). */
export interface TenantFullOnboardRequest {
  email: string;
  password?: string;
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
  nationalId: string;
  leaseStart: string;
  leaseEnd: string;
  propertyId: number;
  unitId: number;
  profileImageUrl?: string;
  profileImage?: string;
  civilIdImageUrl?: string;
  leaseContractFiles: string[];
  notes?: string;
  monthlyRent: number;
  securityDeposit?: number;
  paymentFrequency?: string;
  paymentDay?: number;
  hasFreeMonth?: boolean;
  rentDiscountReason?: string;
  otherReasonText?: string;
}

export interface TenantOnboardingResponse {
  userId: number;
  tenantId: number;
  contractId: number;
  contractNumber: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 50, q?: string, propertyId?: number): Observable<ApiResponse<PagedResponse<Tenant>>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (q && q.trim()) params['q'] = q.trim();
    if (propertyId != null && propertyId > 0) params['propertyId'] = propertyId;
    return this.api.get(AppConstants.API.TENANTS, params);
  }

  getById(id: number): Observable<ApiResponse<Tenant>> {
    return this.api.get(AppConstants.API.TENANT_BY_ID(id));
  }

  getByUnitId(unitId: number): Observable<ApiResponse<Tenant>> {
    return this.api.get(AppConstants.API.TENANT_BY_UNIT(unitId));
  }

  create(payload: TenantRequest): Observable<ApiResponse<Tenant>> {
    return this.api.post(AppConstants.API.TENANTS, payload);
  }

  /** One request: TENANT user + tenant row + draft lease + unit marked rented (server transaction). */
  onboard(payload: TenantFullOnboardRequest): Observable<ApiResponse<TenantOnboardingResponse>> {
    return this.api.post(AppConstants.API.TENANTS_ONBOARD, payload);
  }

  update(id: number, payload: TenantRequest): Observable<ApiResponse<Tenant>> {
    return this.api.put(AppConstants.API.TENANT_BY_ID(id), payload);
  }

  unlinkUnit(id: number): Observable<ApiResponse<Tenant>> {
    return this.api.patch(AppConstants.API.TENANT_UNLINK_UNIT(id));
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(AppConstants.API.TENANT_BY_ID(id));
  }
}
