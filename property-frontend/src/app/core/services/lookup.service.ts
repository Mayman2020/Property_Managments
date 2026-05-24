import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export type LookupType =
  | 'COUNTRY' | 'CITY'
  | 'UNIT_TYPE' | 'PROPERTY_TYPE' | 'PROPERTY_STATUS' | 'FLOOR_TYPE'
  | 'PAYMENT_METHOD' | 'PAYMENT_FREQUENCY'
  | 'CONTRACT_TYPE' | 'CONTRACT_STATUS' | 'TERMINATION_REASON'
  | 'JOB_TITLE' | 'UNIT_OF_MEASURE'
  | 'COMPLAINT_STATUS' | 'COMPLAINT_PRIORITY' | 'COMPLAINT_TYPE'
  | 'LEAVE_TYPE' | 'LEAVE_STATUS' | 'PAYMENT_SCHEDULE_STATUS'
  | 'EXPENSE_STATUS' | 'PAYROLL_STATUS' | 'MAINTENANCE_REQUEST_STATUS'
  | 'FURNISHED_STATUS'
  | 'MONTH' | 'YEAR'
  | 'CURRENCY' | 'RENT_DISCOUNT_REASON' | 'CONTRACT_DRAFT_AMEND_REASON';

export interface LookupItem {
  id: number;
  type: LookupType;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: number;
  sortOrder: number;
  active: boolean;
  locked: boolean;
}

export interface CreateCountryRequest {
  code?: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
}

export interface CreateCityRequest {
  countryId: number;
  code?: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
}

export interface CreateClassificationRequest {
  type: LookupType;
  code?: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
}

export interface UpdateLookupRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class LookupService {
  constructor(private readonly api: ApiService) {}

  getCountries(): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get(AppConstants.API.LOOKUPS_COUNTRIES);
  }

  getOmanCountry(): Observable<ApiResponse<LookupItem>> {
    return this.api.get(AppConstants.API.LOOKUPS_COUNTRIES_OMAN);
  }

  getCities(countryId: number): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get(AppConstants.API.LOOKUPS_CITIES, { countryId });
  }

  getByType(type: LookupType): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get(AppConstants.API.LOOKUPS_BY_TYPE, { type });
  }

  getAllByType(type: LookupType): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get(AppConstants.API.LOOKUPS_CLASSIFICATIONS, { type });
  }

  createCountry(payload: CreateCountryRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.post(AppConstants.API.LOOKUPS_COUNTRIES, payload);
  }

  createCity(payload: CreateCityRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.post(AppConstants.API.LOOKUPS_CITIES, payload);
  }

  createClassification(payload: CreateClassificationRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.post(AppConstants.API.LOOKUPS_CLASSIFICATIONS, payload);
  }

  update(id: number, payload: UpdateLookupRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.put(AppConstants.API.LOOKUP_BY_ID(id), payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(AppConstants.API.LOOKUP_BY_ID(id));
  }
}
