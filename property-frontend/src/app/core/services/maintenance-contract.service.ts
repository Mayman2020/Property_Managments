import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
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
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>('/maintenance-contracts');
  }

  getById(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse>>(`/maintenance-contracts/${id}`);
  }

  listByProperty(propertyId: number): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(
      `/properties/${propertyId}/maintenance-contracts`
    );
  }

  listByCompany(companyId: number): Observable<ApiResponse<MaintenanceContractResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractResponse[]>>(
      `/maintenance-companies/${companyId}/contracts`
    );
  }

  activate(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(
      `/maintenance-contracts/${id}/activate`
    );
  }

  terminate(id: number): Observable<ApiResponse<MaintenanceContractResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractResponse>>(
      `/maintenance-contracts/${id}/terminate`
    );
  }
}
