import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export type LookupType =
  | 'COUNTRY' | 'CITY'
  | 'UNIT_TYPE' | 'PROPERTY_TYPE' | 'PROPERTY_STATUS' | 'FLOOR_TYPE'
  | 'PAYMENT_METHOD' | 'PAYMENT_FREQUENCY'
  | 'CONTRACT_TYPE' | 'CONTRACT_STATUS' | 'TERMINATION_REASON'
  | 'JOB_TITLE' | 'UNIT_OF_MEASURE'
  | 'COMPLAINT_STATUS' | 'COMPLAINT_PRIORITY' | 'COMPLAINT_TYPE'
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
    return this.api.get('/lookups/countries');
  }

  getOmanCountry(): Observable<ApiResponse<LookupItem>> {
    return this.api.get('/lookups/countries/oman');
  }

  getCities(countryId: number): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get('/lookups/cities', { countryId });
  }

  getByType(type: LookupType): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get('/lookups/by-type', { type });
  }

  getAllByType(type: LookupType): Observable<ApiResponse<LookupItem[]>> {
    return this.api.get('/lookups/classifications', { type });
  }

  createCountry(payload: CreateCountryRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.post('/lookups/countries', payload);
  }

  createCity(payload: CreateCityRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.post('/lookups/cities', payload);
  }

  createClassification(payload: CreateClassificationRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.post('/lookups/classifications', payload);
  }

  update(id: number, payload: UpdateLookupRequest): Observable<ApiResponse<LookupItem>> {
    return this.api.put(`/lookups/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(`/lookups/${id}`);
  }
}
