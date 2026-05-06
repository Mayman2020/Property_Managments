import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { LeaseContract, PaymentMethod, RentPaymentSchedule } from '../models/contract.model';

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
  /** TENANT = needs review; STAFF = office upload, trusted */
  uploadSource?: 'TENANT' | 'STAFF';
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

export interface UploadPaymentProofPayload {
  proofUrl: string;
  proofUrls?: string[];
  paymentDate?: string;
  notes?: string;
  paymentMethod?: PaymentMethod | string;
}

/** Office upload on behalf of tenant — `POST /tenant-portal/admin/receipts/for-tenant`. */
export interface StaffUploadReceiptPayload {
  tenantId: number;
  contractId?: number;
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

  getMyContracts(): Observable<ApiResponse<LeaseContract[]>> {
    return this.api.get('/tenant-portal/my-contracts');
  }

  getTenantContract(id: number): Observable<ApiResponse<LeaseContract>> {
    return this.api.get(`/tenant-portal/contracts/${id}`);
  }

  getTenantContractSchedule(
    id: number,
    params?: Record<string, string | number | boolean>
  ): Observable<ApiResponse<PagedResponse<RentPaymentSchedule>>> {
    return this.api.get(`/tenant-portal/contracts/${id}/payment-schedule`, params);
  }

  uploadPaymentProof(
    contractId: number,
    scheduleId: number,
    payload: UploadPaymentProofPayload
  ): Observable<ApiResponse<RentPaymentSchedule>> {
    return this.api.post(`/tenant-portal/contracts/${contractId}/payment-schedule/${scheduleId}/proof`, payload);
  }

  getMyReceipts(): Observable<ApiResponse<RentReceipt[]>> {
    return this.api.get('/tenant-portal/receipts');
  }

  uploadReceipt(payload: UploadReceiptPayload): Observable<ApiResponse<RentReceipt>> {
    return this.api.post('/tenant-portal/receipts', payload);
  }

  staffUploadReceiptForTenant(payload: StaffUploadReceiptPayload): Observable<ApiResponse<RentReceipt>> {
    return this.api.post('/tenant-portal/admin/receipts/for-tenant', payload);
  }

  getMyContractRequests(): Observable<ApiResponse<ContractActionRequest[]>> {
    return this.api.get('/tenant-portal/contract-requests');
  }

  createContractRequest(payload: ContractActionPayload): Observable<ApiResponse<ContractActionRequest>> {
    return this.api.post('/tenant-portal/contract-requests', payload);
  }
}
