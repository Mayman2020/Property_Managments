import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface MaintenanceInvoice {
  id: number;
  invoiceNumber: string;
  contractorCompanyId: number;
  companyName?: string;
  propertyId?: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
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
  propertyNameAr?: string;
  propertyNameEn?: string;
  propertyCode?: string;
}

export interface MaintenanceInvoiceFilterOption {
  id: number;
  name: string | null;
  nameAr: string | null;
  nameEn: string | null;
}

export interface MaintenanceInvoiceFilterOptions {
  properties: MaintenanceInvoiceFilterOption[];
  companies: MaintenanceInvoiceFilterOption[];
}

@Injectable({ providedIn: 'root' })
export class MaintenanceInvoiceService {
  constructor(private readonly api: ApiService) {}

  // Contractor company officer — submit invoice
  submitInvoice(payload: SubmitInvoicePayload): Observable<ApiResponse<MaintenanceInvoice>> {
    return this.api.post(AppConstants.API.MAINTENANCE_INVOICES, payload);
  }

  // Contractor company officer — view own invoices
  getMyInvoices(year?: number, month?: number, propertyId?: number | null): Observable<ApiResponse<MaintenanceInvoice[]>> {
    const params: Record<string, string> = {};
    if (year != null) params['year'] = String(year);
    if (month != null) params['month'] = String(month);
    if (propertyId != null) params['propertyId'] = String(propertyId);
    return this.api.get(AppConstants.API.MAINTENANCE_INVOICES_MY, params);
  }

  // Contractor company officer — get properties this company serves
  getMyProperties(): Observable<ApiResponse<CompanyProperty[]>> {
    return this.api.get(AppConstants.API.MAINTENANCE_INVOICES_MY_PROPERTIES);
  }

  // Accountant — view all maintenance invoices
  getAllInvoices(year?: number, month?: number, propertyId?: number | null, companyId?: number | null): Observable<ApiResponse<MaintenanceInvoice[]>> {
    const params: Record<string, string> = {};
    if (year != null) params['year'] = String(year);
    if (month != null) params['month'] = String(month);
    if (propertyId != null) params['propertyId'] = String(propertyId);
    if (companyId != null) params['companyId'] = String(companyId);
    return this.api.get(AppConstants.API.ACCOUNTANT_PORTAL_MAINTENANCE_INVOICES, params);
  }

  // Accountant — get filter options (properties with active contracts, and companies for a property)
  getFilterOptions(propertyId?: number | null): Observable<ApiResponse<MaintenanceInvoiceFilterOptions>> {
    const params: Record<string, string> = {};
    if (propertyId != null) params['propertyId'] = String(propertyId);
    return this.api.get(AppConstants.API.ACCOUNTANT_PORTAL_MAINTENANCE_INVOICE_FILTER_OPTIONS, params);
  }

  // Accountant — review invoice
  reviewInvoice(id: number, status: string, notes?: string): Observable<ApiResponse<MaintenanceInvoice>> {
    return this.api.patch(AppConstants.API.ACCOUNTANT_PORTAL_MAINTENANCE_INVOICE_REVIEW(id), { status, notes });
  }
}
