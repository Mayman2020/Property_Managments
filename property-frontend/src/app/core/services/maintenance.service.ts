import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
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
  propertyNameAr?: string;
  propertyNameEn?: string;
  categoryId: number;
  categoryNameAr?: string;
  categoryNameEn?: string;
  title: string;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  contractorCompanyId?: number;
  assignedTo?: number;
  assignedOfficerName?: string;
  assignedOfficerPhone?: string;
  scheduledDate?: string;
  scheduledTimeFrom?: string;
  scheduledTimeTo?: string;
  tenantNotes?: string;
  closedAt?: string;
  scheduleAccepted?: boolean;
  scheduleRejectionNote?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface VisitRating {
  id: number;
  requestId: number;
  rating: number;
  ratingLabel?: string;
  ratingIcon?: string;
  comment?: string;
  createdAt: string;
}

export interface RatingForm {
  rating: number;
  comment?: string;
}

export interface PropertyRoutingInfo {
  hasOfficer: boolean;
  hasCompany: boolean;
  officerUserId?: number;
  officerName?: string;
  companyId?: number;
  companyNameAr?: string;
  companyNameEn?: string;
}

export interface RequestForm {
  propertyId: number;
  unitId: number;
  tenantId?: number;
  categoryIds: number[];
  title: string;
  description: string;
  priority: RequestPriority;
  tenantNotes?: string;
  routingTarget?: 'OFFICER' | 'COMPANY';
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
    return this.api.get(AppConstants.API.MAINTENANCE_REQUESTS, params);
  }

  getByTenant(tenantId: number, params?: Record<string, string | number | boolean>): Observable<ApiResponse<PagedResponse<MaintenanceRequest>>> {
    return this.api.get(AppConstants.API.MAINTENANCE_REQUESTS_TENANT(tenantId), params);
  }

  getByOfficer(officerId: number, params?: Record<string, string | number | boolean>): Observable<ApiResponse<PagedResponse<MaintenanceRequest>>> {
    return this.api.get(AppConstants.API.MAINTENANCE_REQUESTS_OFFICER(officerId), params);
  }

  getCompanyQueue(params?: Record<string, string | number | boolean>): Observable<ApiResponse<PagedResponse<MaintenanceRequest>>> {
    return this.api.get(AppConstants.API.MAINTENANCE_REQUESTS_COMPANY_QUEUE, params);
  }

  getOfficerOpenCount(officerId: number): Observable<ApiResponse<number>> {
    return this.api.get(AppConstants.API.MAINTENANCE_REQUESTS_OFFICER_OPEN_COUNT(officerId));
  }

  getById(id: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.get(AppConstants.API.MAINTENANCE_REQUEST_BY_ID(id));
  }

  getRoutingInfo(propertyId: number): Observable<ApiResponse<PropertyRoutingInfo>> {
    return this.api.get(`${AppConstants.API.MAINTENANCE_REQUESTS}/routing-info`, { propertyId });
  }

  create(form: RequestForm): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.post(AppConstants.API.MAINTENANCE_REQUESTS, form);
  }

  assign(id: number, officerId: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(AppConstants.API.MAINTENANCE_REQUEST_ASSIGN(id), { officerId });
  }

  schedule(id: number, form: ScheduleForm): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(AppConstants.API.MAINTENANCE_REQUEST_SCHEDULE(id), form);
  }

  cancel(id: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(AppConstants.API.MAINTENANCE_REQUEST_CANCEL(id));
  }

  submitVisitReport(requestId: number, form: VisitReportForm): Observable<ApiResponse<VisitReport>> {
    return this.api.post(AppConstants.API.MAINTENANCE_VISIT_REPORT(requestId), form);
  }

  getVisitReport(requestId: number): Observable<ApiResponse<VisitReport>> {
    return this.api.get(AppConstants.API.MAINTENANCE_VISIT_REPORT(requestId));
  }

  startWork(id: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(AppConstants.API.MAINTENANCE_REQUEST_START(id));
  }

  acceptSchedule(id: number): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(AppConstants.API.MAINTENANCE_REQUEST_ACCEPT_SCHEDULE(id));
  }

  rejectSchedule(id: number, rejectionNote: string): Observable<ApiResponse<MaintenanceRequest>> {
    return this.api.patch(AppConstants.API.MAINTENANCE_REQUEST_REJECT_SCHEDULE(id), { rejectionNote });
  }

  submitRating(requestId: number, form: RatingForm): Observable<ApiResponse<VisitRating>> {
    return this.api.post(AppConstants.API.MAINTENANCE_RATING(requestId), form);
  }

  getRating(requestId: number): Observable<ApiResponse<VisitRating>> {
    return this.api.get(AppConstants.API.MAINTENANCE_RATING(requestId));
  }

  getOfficers(): Observable<ApiResponse<PagedResponse<{ id: number; fullName: string; username: string }>>> {
    return this.api.get(AppConstants.API.USERS, { role: 'MAINTENANCE_OFFICER_INTERNAL', size: 100 });
  }

  getCategories(): Observable<ApiResponse<{ id: number; nameAr: string; nameEn: string; icon: string }[]>> {
    return this.api.get(AppConstants.API.MAINTENANCE_CATEGORIES);
  }

  addAttachment(requestId: number, payload: {
    fileUrl: string;
    fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    fileName?: string;
    fileSizeKb?: number;
    uploadedBy?: number;
  }): Observable<ApiResponse<unknown>> {
    return this.api.post(AppConstants.API.MAINTENANCE_REQUEST_ATTACHMENTS(requestId), payload);
  }
}
