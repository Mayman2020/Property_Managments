import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface CompanyOfficer {
  id: number;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  email: string;
  phone?: string;
  active: boolean;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  propertyId?: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
}

export interface CompanyOfficerCreateRequest {
  email: string;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  phone?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  propertyId?: number;
}

export interface CompanyStaffProperty {
  propertyId: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  contractNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyStaffService {
  constructor(private readonly api: ApiService) {}

  listMyOfficers(): Observable<ApiResponse<CompanyOfficer[]>> {
    return this.api.get<ApiResponse<CompanyOfficer[]>>(AppConstants.API.COMPANY_MY_STAFF);
  }

  listMyProperties(): Observable<ApiResponse<CompanyStaffProperty[]>> {
    return this.api.get<ApiResponse<CompanyStaffProperty[]>>(AppConstants.API.COMPANY_MY_STAFF_PROPERTIES);
  }

  createOfficer(request: CompanyOfficerCreateRequest): Observable<ApiResponse<CompanyOfficer>> {
    return this.api.post<ApiResponse<CompanyOfficer>>(AppConstants.API.COMPANY_MY_STAFF, request);
  }

  updateOfficer(id: number, request: CompanyOfficerCreateRequest): Observable<ApiResponse<CompanyOfficer>> {
    return this.api.put<ApiResponse<CompanyOfficer>>(AppConstants.API.COMPANY_MY_STAFF_DELETE(id), request);
  }

  toggleActive(id: number): Observable<ApiResponse<CompanyOfficer>> {
    return this.api.patch<ApiResponse<CompanyOfficer>>(AppConstants.API.COMPANY_MY_STAFF_TOGGLE(id));
  }

  deleteOfficer(id: number, replacementOfficerId?: number): Observable<ApiResponse<void>> {
    const path = replacementOfficerId
      ? `${AppConstants.API.COMPANY_MY_STAFF_DELETE(id)}?replacementOfficerId=${replacementOfficerId}`
      : AppConstants.API.COMPANY_MY_STAFF_DELETE(id);
    return this.api.delete<ApiResponse<void>>(path);
  }
}
