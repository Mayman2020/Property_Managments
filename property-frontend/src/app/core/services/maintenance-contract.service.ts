import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface MaintenanceContractResponse {
  contractId: number;
  propertyId: number;
  contractorCompanyId: number;
  contractorCompanyName: string | null;
  contractorCompanyNameAr: string | null;
  contractorCompanyNameEn: string | null;
  assignmentId: number | null;
  contractNumber: string;
  startDate: string;
  endDate: string | null;
  slaHours: number | null;
  contractValue: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  invoiceCount: number;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceContractService {
  constructor(private readonly api: ApiService) {}

  listAll(): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(AppConstants.API.MAINTENANCE_CONTRACTS);
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

  terminate(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(
      AppConstants.API.MAINTENANCE_CONTRACT_TERMINATE(id)
    );
  }
}
