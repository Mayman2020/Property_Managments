import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface MaintenanceContractInvoiceResponse {
  invoiceId: number;
  invoiceNumber: string;
  contractId: number;
  contractNumber: string | null;
  contractorCompanyId: number;
  contractorCompanyName: string | null;
  contractorCompanyNameAr: string | null;
  contractorCompanyNameEn: string | null;
  propertyId: number;
  invoiceMonth: number;
  invoiceYear: number;
  amount: number;
  dueDate: string | null;
  paidDate: string | null;
  status: string; // DRAFT | ISSUED | PAID | OVERDUE | CANCELLED
  notes: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceContractInvoiceService {
  constructor(private readonly api: ApiService) {}

  listAll(): Observable<ApiResponse<MaintenanceContractInvoiceResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractInvoiceResponse[]>>(AppConstants.API.MAINTENANCE_INVOICES);
  }

  getById(id: number): Observable<ApiResponse<MaintenanceContractInvoiceResponse>> {
    return this.api.get<ApiResponse<MaintenanceContractInvoiceResponse>>(AppConstants.API.MAINTENANCE_INVOICE_BY_ID(id));
  }

  listByContract(contractId: number): Observable<ApiResponse<MaintenanceContractInvoiceResponse[]>> {
    return this.api.get<ApiResponse<MaintenanceContractInvoiceResponse[]>>(
      AppConstants.API.MAINTENANCE_CONTRACT_INVOICES(contractId)
    );
  }

  generateMonthlyInvoices(contractId: number): Observable<ApiResponse<MaintenanceContractInvoiceResponse[]>> {
    return this.api.post<ApiResponse<MaintenanceContractInvoiceResponse[]>>(
      AppConstants.API.MAINTENANCE_CONTRACT_GENERATE_MONTHLY_INVOICES(contractId),
      {}
    );
  }

  markPaid(id: number): Observable<ApiResponse<MaintenanceContractInvoiceResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractInvoiceResponse>>(
      AppConstants.API.MAINTENANCE_INVOICE_MARK_PAID(id)
    );
  }

  cancel(id: number): Observable<ApiResponse<MaintenanceContractInvoiceResponse>> {
    return this.api.patch<ApiResponse<MaintenanceContractInvoiceResponse>>(
      AppConstants.API.MAINTENANCE_INVOICE_CANCEL(id)
    );
  }

  monthName(month: number, lang: string): string {
    const ar = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                 'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const en = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
    const idx = month - 1;
    return lang === 'ar' ? (ar[idx] ?? String(month)) : (en[idx] ?? String(month));
  }

  statusColor(status: string): string {
    switch (status) {
      case 'PAID':      return '#155724';
      case 'ISSUED':    return '#004085';
      case 'OVERDUE':   return '#721c24';
      case 'CANCELLED': return '#6c757d';
      default:          return '#856404'; // DRAFT
    }
  }
}
