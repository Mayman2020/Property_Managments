import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface ContractExpiryRow {
  contractId: number;
  contractNumber: string;
  propertyId: number;
  propertyName: string;
  unitId: number;
  unitNumber: string;
  tenantId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  monthlyRent: number;
  status: string;
}

export interface PropertyOccupancy {
  propertyId: number;
  propertyName: string;
  totalUnits: number;
  rentedUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
}

export interface OccupancyAnalytics {
  totalUnits: number;
  rentedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  averageMonthlyRent: number;
  byProperty: PropertyOccupancy[];
}

export interface MaintenanceStatusBreakdown {
  status: string;
  count: number;
}

export interface MaintenanceReportRequest {
  id: number;
  requestNumber?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  propertyId?: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  unitId?: number;
  unitNumber?: string;
  tenantId?: number;
  tenantName?: string;
  tenantNameAr?: string;
  tenantNameEn?: string;
  assignedTo?: number;
  scheduledDate?: string;
  scheduledTimeFrom?: string;
  scheduledTimeTo?: string;
  slaDeadline?: string;
  slaBreached?: boolean;
  createdAt?: string;
}

export interface MaintenanceReport {
  totalRequests: number;
  openRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  overdueRequests: number;
  totalInvoicedAmount: number;
  byStatus: MaintenanceStatusBreakdown[];
  requests?: MaintenanceReportRequest[];
}

export interface BudgetVsActualRow {
  budgetId: number;
  propertyId: number;
  propertyName: string;
  categoryName: string;
  categoryNameAr: string;
  categoryNameEn: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  utilizationPercent: number;
  overBudget: boolean;
}

export interface BudgetVsActual {
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  utilizationPercent: number;
  rows: BudgetVsActualRow[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly api: ApiService) {}

  getContractExpiry(daysAhead = 90, propertyId?: number): Observable<ApiResponse<ContractExpiryRow[]>> {
    const params: Record<string, string | number> = { daysAhead };
    if (propertyId) params['propertyId'] = propertyId;
    return this.api.get(AppConstants.API.REPORTS_CONTRACT_EXPIRY, params);
  }

  getOccupancy(propertyId?: number): Observable<ApiResponse<OccupancyAnalytics>> {
    const params: Record<string, string | number> = {};
    if (propertyId) params['propertyId'] = propertyId;
    return this.api.get(AppConstants.API.REPORTS_OCCUPANCY, params);
  }

  getMaintenanceReport(propertyId?: number): Observable<ApiResponse<MaintenanceReport>> {
    const params: Record<string, string | number> = {};
    if (propertyId) params['propertyId'] = propertyId;
    return this.api.get(AppConstants.API.REPORTS_MAINTENANCE, params);
  }

  getBudgetVsActual(propertyId?: number, year?: number): Observable<ApiResponse<BudgetVsActual>> {
    const params: Record<string, string | number> = {};
    if (propertyId) params['propertyId'] = propertyId;
    if (year) params['year'] = year;
    return this.api.get(AppConstants.API.REPORTS_BUDGET_VS_ACTUAL, params);
  }
}
