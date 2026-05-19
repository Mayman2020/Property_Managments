import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface ContractAnnex {
  id: number;
  contractId: number;
  annexNumber?: string;
  title: string;
  description?: string;
  effectiveDate?: string;
  documentUrl?: string;
  createdBy?: number;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractAnnexRequest {
  title: string;
  annexNumber?: string;
  description?: string;
  effectiveDate?: string;
  documentUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ContractAnnexService {
  constructor(private readonly api: ApiService) {}

  getByContract(contractId: number): Observable<ApiResponse<ContractAnnex[]>> {
    return this.api.get(AppConstants.API.CONTRACT_ANNEXES(contractId));
  }

  create(contractId: number, payload: ContractAnnexRequest): Observable<ApiResponse<ContractAnnex>> {
    return this.api.post(AppConstants.API.CONTRACT_ANNEXES(contractId), payload);
  }

  update(contractId: number, id: number, payload: ContractAnnexRequest): Observable<ApiResponse<ContractAnnex>> {
    return this.api.put(AppConstants.API.CONTRACT_ANNEX_BY_ID(contractId, id), payload);
  }

  delete(contractId: number, id: number): Observable<void> {
    return this.api.delete(AppConstants.API.CONTRACT_ANNEX_BY_ID(contractId, id));
  }
}
