import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface Property {
  id: number;
  ownerId: number;
  ownerName?: string;
  propertyName: string;
  propertyCode: string;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';
  address: string;
  city?: string;
  country?: string;
  totalFloors: number;
  totalUnits: number;
  description?: string;
  coverImageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PropertyForm {
  ownerId: number;
  propertyName: string;
  propertyCode: string;
  propertyType: string;
  address: string;
  city?: string;
  country?: string;
  totalFloors?: number;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 20): Observable<ApiResponse<PagedResponse<Property>>> {
    return this.api.get('/properties', { page, size });
  }

  getById(id: number): Observable<ApiResponse<Property>> {
    return this.api.get(`/properties/${id}`);
  }

  create(form: PropertyForm): Observable<ApiResponse<Property>> {
    return this.api.post('/properties', form);
  }

  update(id: number, form: PropertyForm): Observable<ApiResponse<Property>> {
    return this.api.put(`/properties/${id}`, form);
  }

  toggleActive(id: number): Observable<ApiResponse<Property>> {
    return this.api.patch(`/properties/${id}/toggle-active`);
  }
}
