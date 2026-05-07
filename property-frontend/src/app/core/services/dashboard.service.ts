import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  rentedUnits: number;
  reservedUnits?: number;
  vacantUnits: number;
  /** Vacant + reserved (no active lease). */
  unrentedUnits?: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedThisMonth: number;
  lowStockItems: number;
  openMaintenanceRequests: number;
  totalInventoryItems: number;
  activeContracts?: number;
  draftContracts?: number;
  pendingOwnerContracts?: number;
  cancelledContracts?: number;
  expiringIn30Days?: number;
  overduePayments?: number;
  openComplaints?: number;
  requestsByStatus?: Record<string, number>;
  requestsByCategory?: Record<string, number>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface RatingsSummary {
  averageRating: number;
  totalRatings: number;
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

export interface RatingDashboardItem {
  id: number;
  requestId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  requestNumber?: string;
  requestTitle?: string;
  propertyId?: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  unitId?: number;
  unitNumber?: string;
  tenantName?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly api: ApiService) {}

  getStats(): Observable<ApiResponse<DashboardStats>> {
    return this.api.get(AppConstants.API.DASHBOARD_STATS);
  }

  getStatsByProperty(propertyId: number): Observable<ApiResponse<DashboardStats>> {
    return this.api.get(AppConstants.API.DASHBOARD_STATS_PROPERTY(propertyId));
  }

  getRequestsByStatus(): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.api.get(AppConstants.API.DASHBOARD_REQUESTS_BY_STATUS);
  }

  getRequestsByCategory(): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.api.get(AppConstants.API.DASHBOARD_REQUESTS_BY_CATEGORY);
  }

  getMonthlyTrend(propertyId?: number): Observable<ApiResponse<ChartDataPoint[]>> {
    const query = propertyId ? `?propertyId=${propertyId}` : '';
    return this.api.get(`${AppConstants.API.DASHBOARD_MONTHLY_TREND}${query}`);
  }

  getRatingsSummary(): Observable<ApiResponse<RatingsSummary>> {
    return this.api.get(AppConstants.API.DASHBOARD_RATINGS_SUMMARY);
  }

  getRatingsDetails(): Observable<ApiResponse<RatingDashboardItem[]>> {
    return this.api.get(AppConstants.API.DASHBOARD_RATINGS_DETAILS);
  }
}
