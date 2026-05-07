import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface ContractorCompany {
  id: number;
  name: string;
  nameAr?: string;
  nameEn?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  contractStart?: string;
  contractEnd?: string;
  attachmentFiles?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface ContractorCompanyForm {
  name: string;
  nameAr?: string;
  nameEn?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active?: boolean;
  contractStart?: string;
  contractEnd?: string;
  attachmentFiles?: string[];
}

@Injectable({ providedIn: 'root' })
export class ContractorCompanyService {
  constructor(private readonly api: ApiService) {}

  list(all = false, q?: string, propertyId?: number | null): Observable<ApiResponse<ContractorCompany[]>> {
    const params: Record<string, string | number | boolean> = { all };
    if (q && q.trim()) params['q'] = q.trim();
    if (propertyId != null) params['propertyId'] = propertyId;
    return this.api.get(AppConstants.API.CONTRACTOR_COMPANIES, params);
  }

  getById(id: number): Observable<ApiResponse<ContractorCompany>> {
    return this.api.get(AppConstants.API.CONTRACTOR_COMPANY_BY_ID(id));
  }

  create(body: ContractorCompanyForm): Observable<ApiResponse<ContractorCompany>> {
    return this.api.post(AppConstants.API.CONTRACTOR_COMPANIES, body);
  }

  update(id: number, body: ContractorCompanyForm): Observable<ApiResponse<ContractorCompany>> {
    return this.api.put(AppConstants.API.CONTRACTOR_COMPANY_BY_ID(id), body);
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.api.delete(AppConstants.API.CONTRACTOR_COMPANY_BY_ID(id));
  }
}
