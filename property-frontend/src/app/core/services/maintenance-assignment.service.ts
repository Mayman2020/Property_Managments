import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export interface ContractInfo {
  contractId: number;
  contractNumber: string | null;
  startDate: string;
  endDate: string | null;
  slaHours: number | null;
  contractValue: number | null;
  status: string;
}

export interface MaintenanceAssignment {
  assignmentId: number;
  propertyId: number;
  status: string;
  isPrimary: boolean;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;

  providerId: number | null;
  providerType: 'USER' | 'COMPANY' | null;

  userId: number | null;
  userFullName: string | null;
  userEmail: string | null;
  userRole: string | null;

  companyId: number | null;
  companyName: string | null;
  companyNameAr: string | null;
  companyNameEn: string | null;
  companyPhone: string | null;
  companyEmail: string | null;

  contract: ContractInfo | null;
}

export interface AssignMaintenanceRequest {
  providerType: 'USER' | 'COMPANY';
  userId?: number | null;
  companyId?: number | null;
  isPrimary: boolean;
  startDate?: string | null;
  notes?: string | null;
  contract?: {
    startDate: string;      // required for COMPANY
    endDate?: string | null;
    slaHours?: number | null;
    contractValue?: number | null;
    notes?: string | null;
    // contractNumber is backend-generated — do not send from frontend
  } | null;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceAssignmentService {
  constructor(private readonly api: ApiService) {}

  list(propertyId: number): Observable<ApiResponse<MaintenanceAssignment[]>> {
    return this.api.get<ApiResponse<MaintenanceAssignment[]>>(
      `/properties/${propertyId}/maintenance-assignments`
    );
  }

  assign(propertyId: number, req: AssignMaintenanceRequest): Observable<ApiResponse<MaintenanceAssignment>> {
    return this.api.post<ApiResponse<MaintenanceAssignment>>(
      `/properties/${propertyId}/maintenance-assignments`,
      req
    );
  }

  endAssignment(propertyId: number, assignmentId: number): Observable<ApiResponse<MaintenanceAssignment>> {
    return this.api.patch<ApiResponse<MaintenanceAssignment>>(
      `/properties/${propertyId}/maintenance-assignments/${assignmentId}/end`
    );
  }
}
