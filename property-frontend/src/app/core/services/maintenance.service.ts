import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export type RequestStatus =
  | 'PENDING' | 'ASSIGNED' | 'SCHEDULED' | 'IN_PROGRESS'
  | 'TENANT_ABSENT' | 'COMPLETED' | 'CANCELLED' | 'NEEDS_REVISIT';

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface MaintenanceRequest {
  id: number;
  requestNumber: string;
  tenantId: number;
  tenantName?: string;
  unitId: number;
  unitNumber?: string;
  propertyId: number;
  propertyName?: string;
  categoryId: number;
  categoryNameAr?: string;
  categoryNameEn?: string;
  title: string;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo?: number;
  assignedOfficerName?: string;
  scheduledDate?: string;
  scheduledTimeFrom?: string;
  scheduledTimeTo?: string;
  tenantNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestForm {
  categoryId: number;
  title: string;
  description: string;
  priority: RequestPriority;
}

export interface ScheduleForm {
  scheduledDate: string;
  scheduledTimeFrom: string;
  scheduledTimeTo: string;
}

export interface VisitReport {
  id: number;
  requestId: number;
  officerId: number;
  visitDate: string;
  visitOutcome: string;
  workDone?: string;
  officerNotes?: string;
  hasPurchase: boolean;
  receiptUrl?: string;
  purchaseAmount?: number;
  purchaseNotes?: string;
}

export interface VisitReportForm {
  visitDate: string;
  visitOutcome: string;
  workDone?: string;
  officerNotes?: string;
  hasPurchase: boolean;
  purchaseAmount?: number;
  purchaseNotes?: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  constructor(private readonly api: ApiService) {}

  getRequests(params?: Record<string, string | number | boolean>): Observable<ApiResponse<PagedResponse<MaintenanceRequest>>> {
    return this.api.get('/maintenance/requests', params);
  }

  getById(id: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.get(`/maintenance/requests/${id}`);
  }

  create(form: RequestForm): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.post('/maintenance/requests', form);
  }

  assign(id: number, officerId: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(`/maintenance/requests/${id}/assign`, { officerId });
  }

  schedule(id: number, form: ScheduleForm): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(`/maintenance/requests/${id}/schedule`, form);
  }

  cancel(id: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(`/maintenance/requests/${id}/cancel`);
  }

  submitVisitReport(requestId: number, form: VisitReportForm): Observable<ApiResponse<VisitReport>> {
    return this.api.post(`/maintenance/requests/${requestId}/visit-report`, form);
  }

  getVisitReport(requestId: number): Observable<ApiResponse<VisitReport>> {
    return this.api.get(`/maintenance/requests/${requestId}/visit-report`);
  }

  getCategories(): Observable<ApiResponse<{ id: number; nameAr: string; nameEn: string; icon: string }[]>> {
    return this.api.get('/maintenance/categories');
  }

  addAttachment(requestId: number, payload: {
    fileUrl: string;
    fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    fileName?: string;
    fileSizeKb?: number;
    uploadedBy?: number;
  }): Observable<ApiResponse<unknown>> {
    return this.api.post(`/maintenance/requests/${requestId}/attachments`, payload);
  }
}
