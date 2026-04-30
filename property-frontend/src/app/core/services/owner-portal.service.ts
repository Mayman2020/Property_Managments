import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export interface OwnerDashboardDto {
  totalProperties: number;
  totalRevenue: number;
  totalExpenses: number;
  ownerNetAmount: number;
}

export interface OwnerPropertyItem {
  id: number;
  propertyName: string;
  propertyCode?: string;
  totalUnits?: number;
  occupiedUnits?: number;
}

export interface OwnerStatementItem {
  id: number;
  propertyName?: string;
  statementMonth: number;
  statementYear: number;
  totalRevenue: number;
  totalExpenses: number;
  ownerNetAmount: number;
  status?: string;
  pdfUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class OwnerPortalService {
  constructor(private readonly api: ApiService) {}

  getDashboard(): Observable<ApiResponse<OwnerDashboardDto>> {
    return this.api.get('/owner-portal/dashboard');
  }

  getStatements(): Observable<ApiResponse<OwnerStatementItem[]>> {
    return this.api.get('/owner-portal/statements');
  }

  getProperties(): Observable<ApiResponse<OwnerPropertyItem[]>> {
    return this.api.get('/owner-portal/properties');
  }
}
