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

@Injectable({ providedIn: 'root' })
export class UnitService {
  constructor(private readonly api: ApiService) {}

  getByProperty(propertyId: number, page = 0, size = 200): Observable<ApiResponse<PagedResponse<Unit>>> {
    return this.api.get(`/units/property/${propertyId}`, { page, size });
  }
}
