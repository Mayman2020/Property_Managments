import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface Unit {
  id: number;
  propertyId: number;
  floorId?: number;
  unitNumber: string;
  unitType?: 'APARTMENT' | 'SHOP' | 'OFFICE' | 'VILLA' | 'WAREHOUSE' | 'OTHER';
  areaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  rented: boolean;
  rentAmount?: number;
  currency?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitRequest {
  propertyId: number;
  floorId?: number;
  unitNumber: string;
  unitType: 'APARTMENT' | 'SHOP' | 'OFFICE' | 'VILLA' | 'WAREHOUSE' | 'OTHER';
  areaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  rentAmount?: number;
  currency?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class UnitService {
  constructor(private readonly api: ApiService) {}

  getByProperty(propertyId: number, page = 0, size = 200, q?: string): Observable<ApiResponse<PagedResponse<Unit>>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (q && q.trim()) params['q'] = q.trim();
    return this.api.get(`/units/property/${propertyId}`, params);
  }

  create(payload: UnitRequest): Observable<ApiResponse<Unit>> {
    return this.api.post('/units', payload);
  }

  update(id: number, payload: UnitRequest): Observable<ApiResponse<Unit>> {
    return this.api.put(`/units/${id}`, payload);
  }

  setRentalStatus(id: number, rented: boolean): Observable<ApiResponse<Unit>> {
    return this.api.patch(`/units/${id}/rental-status?rented=${rented}`);
  }
}
