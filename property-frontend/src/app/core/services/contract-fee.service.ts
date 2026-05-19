import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface ContractFee {
  id: number;
  contractId: number;
  feeType?: string;
  description?: string;
  amount: number;
  dueDate?: string;
  paid: boolean;
  paidDate?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt?: string;
}

export interface ContractFeeRequest {
  contractId: number;
  feeType?: string;
  description?: string;
  amount: number;
  dueDate?: string;
  paid?: boolean;
  paidDate?: string;
  receiptUrl?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ContractFeeService {
  constructor(private readonly api: ApiService) {}

  getByContract(contractId: number): Observable<ApiResponse<ContractFee[]>> {
    return this.api.get<ApiResponse<ContractFee[]>>(AppConstants.API.CONTRACT_FEES_BY_CONTRACT(contractId));
  }

  create(req: ContractFeeRequest): Observable<ApiResponse<ContractFee>> {
    return this.api.post<ApiResponse<ContractFee>>(AppConstants.API.CONTRACT_FEES, req);
  }

  markPaid(id: number, receiptUrl?: string): Observable<ApiResponse<ContractFee>> {
    const params = receiptUrl ? { receiptUrl } : {};
    return this.api.patch<ApiResponse<ContractFee>>(`${AppConstants.API.CONTRACT_FEES}/${id}/mark-paid`, params);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(`${AppConstants.API.CONTRACT_FEES}/${id}`);
  }
}
