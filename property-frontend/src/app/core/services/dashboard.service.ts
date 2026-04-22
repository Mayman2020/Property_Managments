import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  rentedUnits: number;
  vacantUnits: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedThisMonth: number;
  lowStockItems: number;
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
    return this.api.get('/dashboard/stats');
  }

  getRequestsByStatus(): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.api.get('/dashboard/requests-by-status');
  }

  getRequestsByCategory(): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.api.get('/dashboard/requests-by-category');
  }

  getMonthlyTrend(): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.api.get('/dashboard/monthly-trend');
  }

  getRatingsSummary(): Observable<ApiResponse<RatingsSummary>> {
    return this.api.get('/dashboard/ratings-summary');
  }

  getRatingsDetails(): Observable<ApiResponse<RatingDashboardItem[]>> {
    return this.api.get('/dashboard/ratings-details');
  }
}
