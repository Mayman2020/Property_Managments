import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface Tenant {
  id: number;
  userId?: number;
  unitId?: number;
  propertyId?: number;
  fullName: string;
  nationalId?: string;
  phone: string;
  email?: string;
  leaseStart?: string;
  leaseEnd?: string;
  profileImage?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantRequest {
  fullName: string;
  unitId?: number;
  propertyId?: number;
  userId?: number;
  nationalId?: string;
  phone: string;
  email?: string;
  leaseStart?: string;
  leaseEnd?: string;
  profileImage?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 50, q?: string): Observable<ApiResponse<PagedResponse<Tenant>>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (q && q.trim()) params['q'] = q.trim();
    return this.api.get('/tenants', params);
  }

  getByUnitId(unitId: number): Observable<ApiResponse<Tenant>> {
    return this.api.get(`/tenants/by-unit/${unitId}`);
  }

  create(payload: TenantRequest): Observable<ApiResponse<Tenant>> {
    return this.api.post('/tenants', payload);
  }

  update(id: number, payload: TenantRequest): Observable<ApiResponse<Tenant>> {
    return this.api.put(`/tenants/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(`/tenants/${id}`);
  }
}
