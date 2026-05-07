import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface OwnerSummary {
  id: number;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
}

export interface MaintenanceProviderSummary {
  id: number;
  providerType: 'USER' | 'COMPANY';
  name: string;
}

export interface Property {
  id: number;
  ownerId: number;
  owners?: OwnerSummary[];
  maintenanceProviders?: MaintenanceProviderSummary[];
  propertyName: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  propertyCode: string;
  propertyType: string;
  address: string;
  city?: string;
  country?: string;
  googleMapUrl?: string;
  totalFloors: number;
  totalUnits: number;
  description?: string;
  coverImageUrl?: string;
  coverImageUrls?: string[];
  ownerDocumentFiles?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface PropertyForm {
  ownerIds: number[];
  propertyName: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  propertyType: string;
  address: string;
  city?: string;
  country?: string;
  googleMapUrl?: string;
  totalFloors?: number;
  floorUnitsConfig?: Record<number, number>;
  description?: string;
  coverImageUrl?: string;
  coverImageUrls?: string[];
  ownerDocumentFiles: string[];
  maintenanceProviderType?: string;
  maintenanceProviderIds?: number[];
}

@Injectable({ providedIn: 'root' })
export class PropertyService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 20, q?: string, propertyId?: number | null): Observable<ApiResponse<PagedResponse<Property>>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (q && q.trim()) params['q'] = q.trim();
    if (propertyId != null && propertyId > 0) params['propertyId'] = propertyId;
    return this.api.get<ApiResponse<PagedResponse<Property>>>(AppConstants.API.PROPERTIES, params).pipe(
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
    return this.api.get<ApiResponse<Property>>(AppConstants.API.PROPERTY_BY_ID(id)).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  create(form: PropertyForm): Observable<ApiResponse<Property>> {
    return this.api.post<ApiResponse<Property>>(AppConstants.API.PROPERTIES, form).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  update(id: number, form: PropertyForm): Observable<ApiResponse<Property>> {
    return this.api.put<ApiResponse<Property>>(AppConstants.API.PROPERTY_BY_ID(id), form).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  toggleActive(id: number): Observable<ApiResponse<Property>> {
    return this.api.patch<ApiResponse<Property>>(AppConstants.API.PROPERTY_TOGGLE_ACTIVE(id)).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeProperty(res.data) : res.data }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(AppConstants.API.PROPERTY_BY_ID(id));
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
