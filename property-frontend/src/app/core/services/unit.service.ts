import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { withPageParams } from '../utils/pagination.util';

export interface Unit {
  id: number;
  propertyId: number;
  floorId?: number;
  /** 1-based floor index from API; use for display instead of floorId when present. */
  floorNumber?: number;
  unitNumber: string;
  unitType?: string;
  furnishedStatus?: string;
  areaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  rented: boolean;
  /** Draft / pending-owner lease on unit, no active lease. */
  reserved?: boolean;
  /** Active vacancy listing published for this unit. */
  vacancyPublished?: boolean;
  rentAmount?: number;
  currency?: string;
  notes?: string;
  floorPlanUrl?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface UnitRequest {
  propertyId: number;
  floorId?: number;
  unitNumber: string;
  unitType: string;
  furnishedStatus: string;
  areaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  rentAmount?: number;
  currency?: string;
  notes?: string;
  floorPlanUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UnitService {
  constructor(private readonly api: ApiService) {}

  getByProperty(propertyId: number, page = 0, size = 20, q?: string): Observable<ApiResponse<PagedResponse<Unit>>> {
    return this.api.get(AppConstants.API.UNITS_BY_PROPERTY(propertyId), withPageParams(page, size, {
      q: q?.trim() || undefined
    }));
  }

  getAll(
    page = 0,
    size = 20,
    filters?: {
      propertyId?: number | null;
      q?: string;
      floor?: number | null;
      unitType?: string | null;
      status?: string | null;
      active?: boolean | null;
    }
  ): Observable<ApiResponse<PagedResponse<Unit>>> {
    return this.api.get(AppConstants.API.UNITS, withPageParams(page, size, {
      propertyId: filters?.propertyId ?? undefined,
      q: filters?.q?.trim() || undefined,
      floor: filters?.floor ?? undefined,
      unitType: filters?.unitType ?? undefined,
      status: filters?.status ?? undefined,
      active: filters?.active ?? undefined
    }));
  }

  create(payload: UnitRequest): Observable<ApiResponse<Unit>> {
    return this.api.post(AppConstants.API.UNITS, payload);
  }

  update(id: number, payload: UnitRequest): Observable<ApiResponse<Unit>> {
    return this.api.put(AppConstants.API.UNIT_BY_ID(id), payload);
  }

  /** Server recomputes {@code rented} from leases; {@code rented} query is ignored. */
  setRentalStatus(id: number, rented: boolean): Observable<ApiResponse<Unit>> {
    return this.api.patch(AppConstants.API.UNIT_RENTAL_STATUS(id, rented));
  }

  toggleActive(id: number): Observable<ApiResponse<Unit>> {
    return this.api.patch(AppConstants.API.UNIT_TOGGLE_ACTIVE(id));
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(AppConstants.API.UNIT_BY_ID(id));
  }
}
