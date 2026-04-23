import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface Property {
  id: number;
  ownerId: number;
  ownerName?: string;
  propertyName: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  propertyCode: string;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';
  address: string;
  city?: string;
  country?: string;
  googleMapUrl?: string;
  totalFloors: number;
  totalUnits: number;
  description?: string;
  coverImageUrl?: string;
  ownerDocumentFiles?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface PropertyForm {
  ownerId: number;
  propertyName: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  propertyCode: string;
  propertyType: string;
  address: string;
  city?: string;
  country?: string;
  googleMapUrl?: string;
  totalFloors?: number;
  description?: string;
  coverImageUrl?: string;
  ownerDocumentFiles: string[];
}

@Injectable({ providedIn: 'root' })
export class PropertyService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 20, q?: string): Observable<ApiResponse<PagedResponse<Property>>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (q && q.trim()) params['q'] = q.trim();
    return this.api.get<ApiResponse<PagedResponse<Property>>>('/properties', params).pipe(
      map((res) => ({
        ...res,
        data: res.data
          ? {
              ...res.data,
              content: (res.data.content ?? []).map((p) => this.normalizeProperty(p))
            }
          : res.data
      }))
    );
  }

  getById(id: number): Observable<ApiResponse<Property>> {
    return this.api.get<ApiResponse<Property>>(`/properties/${id}`).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  create(form: PropertyForm): Observable<ApiResponse<Property>> {
    return this.api.post<ApiResponse<Property>>('/properties', form).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  update(id: number, form: PropertyForm): Observable<ApiResponse<Property>> {
    return this.api.put<ApiResponse<Property>>(`/properties/${id}`, form).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  toggleActive(id: number): Observable<ApiResponse<Property>> {
    return this.api.patch<ApiResponse<Property>>(`/properties/${id}/toggle-active`).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  private normalizeProperty(property: Property & { active?: boolean }): Property {
    const isActive = typeof property.isActive === 'boolean' ? property.isActive : !!property.active;
    const propertyName = property.propertyName || property.propertyNameAr || property.propertyNameEn || '';
    return {
      ...property,
      propertyName,
      isActive
    };
  }
}
