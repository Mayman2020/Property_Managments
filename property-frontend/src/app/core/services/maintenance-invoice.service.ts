import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export interface MaintenanceInvoice {
  id: number;
  invoiceNumber: string;
  contractorCompanyId: number;
  companyName?: string;
  propertyId?: number;
  propertyName?: string;
  unitId?: number;
  unitNumber?: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  description?: string;
  fileUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SubmitInvoicePayload {
  periodMonth: number;
  periodYear: number;
  amount: number;
  propertyId?: number;
  unitId?: number;
  description?: string;
  fileUrl?: string;
  notes?: string;
}

export interface CompanyProperty {
  id: number;
  propertyName: string;
  propertyCode?: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceInvoiceService {
  constructor(private readonly api: ApiService) {}

  // Contractor company officer — submit invoice
  submitInvoice(payload: SubmitInvoicePayload): Observable<ApiResponse<MaintenanceInvoice>> {
    return this.api.post('/maintenance-invoices', payload);
  }

  // Contractor company officer — view own invoices
  getMyInvoices(year?: number, month?: number): Observable<ApiResponse<MaintenanceInvoice[]>> {
    const params: Record<string, string> = {};
    if (year != null) params['year'] = String(year);
    if (month != null) params['month'] = String(month);
    return this.api.get('/maintenance-invoices/my', params);
  }

  // Contractor company officer — get properties this company serves
  getMyProperties(): Observable<ApiResponse<CompanyProperty[]>> {
    return this.api.get('/maintenance-invoices/my-properties');
  }

  // Accountant — view all maintenance invoices
  getAllInvoices(year?: number, month?: number): Observable<ApiResponse<MaintenanceInvoice[]>> {
    const params: Record<string, string> = {};
    if (year != null) params['year'] = String(year);
    if (month != null) params['month'] = String(month);
    return this.api.get('/accountant-portal/maintenance-invoices', params);
  }

  // Accountant — review invoice
  reviewInvoice(id: number, status: string, notes?: string): Observable<ApiResponse<MaintenanceInvoice>> {
    return this.api.patch(`/accountant-portal/maintenance-invoices/${id}/review`, { status, notes });
  }
}
