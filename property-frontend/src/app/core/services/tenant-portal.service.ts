import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { LeaseContract } from '../models/contract.model';

export interface RentReceipt {
  id: number;
  tenantId: number;
  contractId?: number;
  periodMonth: number;
  periodYear: number;
  amount?: number;
  fileUrl: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface ContractActionRequest {
  id: number;
  tenantId: number;
  contractId: number;
  actionType: 'RENEWAL' | 'TERMINATION';
  requestedDate?: string;
  reason?: string;
  notes?: string;
  attachmentUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  adminNotes?: string;
  createdAt: string;
}

export interface UploadReceiptPayload {
  periodMonth: number;
  periodYear: number;
  amount?: number;
  fileUrl: string;
  notes?: string;
}

export interface ContractActionPayload {
  contractId: number;
  actionType: 'RENEWAL' | 'TERMINATION';
  requestedDate?: string;
  reason?: string;
  notes?: string;
  attachmentUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class TenantPortalService {
  constructor(private readonly api: ApiService) {}

  getMyContract(): Observable<ApiResponse<LeaseContract>> {
    return this.api.get('/tenant-portal/my-contract');
  }

  getMyReceipts(): Observable<ApiResponse<RentReceipt[]>> {
    return this.api.get('/tenant-portal/receipts');
  }

  uploadReceipt(payload: UploadReceiptPayload): Observable<ApiResponse<RentReceipt>> {
    return this.api.post('/tenant-portal/receipts', payload);
  }

  getMyContractRequests(): Observable<ApiResponse<ContractActionRequest[]>> {
    return this.api.get('/tenant-portal/contract-requests');
  }

  createContractRequest(payload: ContractActionPayload): Observable<ApiResponse<ContractActionRequest>> {
    return this.api.post('/tenant-portal/contract-requests', payload);
  }
}
