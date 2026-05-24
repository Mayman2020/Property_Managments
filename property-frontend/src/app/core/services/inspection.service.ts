import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export type InspectionType = 'MOVE_IN' | 'MOVE_OUT';
export type InspectionStatus = 'PENDING' | 'COMPLETED' | 'SIGNED';
export type ItemCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'MISSING';

export interface InspectionItem {
  id: number;
  area: string;
  condition?: ItemCondition;
  notes?: string;
  photoUrl?: string;
  estimatedDeduction?: number;
}

export interface Inspection {
  id: number;
  unitId: number;
  contractId: number;
  inspectionType: InspectionType;
  status: InspectionStatus;
  inspectorId?: number;
  tenantSignedAt?: string;
  inspectorSignedAt?: string;
  notes?: string;
  totalDeduction?: number;
  createdAt?: string;
  items?: InspectionItem[];
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  constructor(private readonly api: ApiService) {}

  listByContract(contractId: number): Observable<ApiResponse<Inspection[]>> {
    return this.api.get(AppConstants.API.CONTRACT_INSPECTIONS(contractId));
  }

  getById(id: number): Observable<ApiResponse<Inspection>> {
    return this.api.get(AppConstants.API.INSPECTION_BY_ID(id));
  }

  create(contractId: number, type: InspectionType): Observable<ApiResponse<Inspection>> {
    return this.api.post(AppConstants.API.CONTRACT_INSPECTIONS(contractId), { type });
  }

  updateItem(inspectionId: number, itemId: number, body: Partial<InspectionItem>): Observable<ApiResponse<InspectionItem>> {
    return this.api.patch(AppConstants.API.INSPECTION_ITEM(inspectionId, itemId), body);
  }

  complete(inspectionId: number): Observable<ApiResponse<Inspection>> {
    return this.api.patch(AppConstants.API.INSPECTION_COMPLETE(inspectionId), {});
  }

  sign(inspectionId: number, role: 'TENANT' | 'INSPECTOR'): Observable<ApiResponse<Inspection>> {
    return this.api.patch(AppConstants.API.INSPECTION_SIGN(inspectionId), { role });
  }

  linkDamages(inspectionId: number): Observable<ApiResponse<{ totalDeduction: number; depositAmount: number; remainingDeposit: number }>> {
    return this.api.patch(AppConstants.API.INSPECTION_LINK_DAMAGES(inspectionId), {});
  }

  listTenant(contractId: number): Observable<ApiResponse<Inspection[]>> {
    return this.api.get(AppConstants.API.TENANT_CONTRACT_INSPECTIONS(contractId));
  }

  signTenant(inspectionId: number): Observable<ApiResponse<Inspection>> {
    return this.api.patch(AppConstants.API.TENANT_INSPECTION_SIGN(inspectionId), { role: 'TENANT' });
  }
}
