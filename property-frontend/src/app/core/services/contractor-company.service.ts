import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { withPageParams } from '../utils/pagination.util';
import { CompanyOfficer } from './company-staff.service';

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
  latestMaintenanceContractStatus?: string;
  latestMaintenanceContractOwnerApprovalStatus?: string;
  latestMaintenanceContractNumber?: string;
  contractStart?: string;
  contractEnd?: string;
  latestContractStart?: string;
  latestContractEnd?: string;
  latestContractValue?: number;
  propertiesCount?: number;
  attachmentFiles?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface AllCompanyOfficer {
  id: number;
  fullName?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  email?: string;
  phone?: string;
  active: boolean;
  profileImageUrl?: string;
  propertyId?: number;
  propertyNameAr?: string;
  propertyNameEn?: string;
  companyId: number;
  companyNameAr?: string;
  companyNameEn?: string;
}

export interface ContractorPropertyContract {
  contractId: number;
  contractNumber?: string;
  propertyId: number;
  propertyNameAr?: string;
  propertyNameEn?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  slaHours?: number;
  contractValue?: number;
  createdAt?: string;
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
  portalPropertyId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ContractorCompanyService {
  constructor(private readonly api: ApiService) {}

  list(all = false, q?: string, propertyId?: number | null): Observable<ApiResponse<ContractorCompany[]>> {
    return this.listPaged(0, 500, q, propertyId, null, all).pipe(
      map((res) => ({
        ...res,
        data: (res.data?.content ?? []) as unknown as ContractorCompany[]
      }))
    );
  }

  listPaged(
    page = 0,
    size = 20,
    q?: string,
    propertyId?: number | null,
    active?: boolean | null,
    all = false
  ): Observable<ApiResponse<PagedResponse<ContractorCompany>>> {
    const params = withPageParams(page, size, {
      all,
      q: q?.trim(),
      propertyId: propertyId ?? undefined,
      active: active ?? undefined
    });
    params['sort'] = 'name,asc';
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

  getOfficers(id: number): Observable<ApiResponse<CompanyOfficer[]>> {
    return this.api.get(AppConstants.API.CONTRACTOR_COMPANY_OFFICERS(id));
  }

  getMaintenanceContracts(id: number): Observable<ApiResponse<ContractorPropertyContract[]>> {
    return this.api.get(`${AppConstants.API.CONTRACTOR_COMPANIES}/${id}/maintenance-contracts`);
  }

  getAllOfficers(): Observable<ApiResponse<AllCompanyOfficer[]>> {
    return this.api.get(`${AppConstants.API.CONTRACTOR_COMPANIES}/officers`);
  }
}
