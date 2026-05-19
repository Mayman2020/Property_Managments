import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface LegalEntity {
  id: number;
  nameAr: string;
  nameEn?: string;
  commercialRegistration?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalEntityRequest {
  nameAr: string;
  nameEn?: string;
  commercialRegistration?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LegalEntityService {
  constructor(private readonly api: ApiService) {}

  getAll(activeOnly = false): Observable<ApiResponse<LegalEntity[]>> {
    return this.api.get(AppConstants.API.LEGAL_ENTITIES, { activeOnly });
  }

  getById(id: number): Observable<ApiResponse<LegalEntity>> {
    return this.api.get(AppConstants.API.LEGAL_ENTITY_BY_ID(id));
  }

  create(payload: LegalEntityRequest): Observable<ApiResponse<LegalEntity>> {
    return this.api.post(AppConstants.API.LEGAL_ENTITIES, payload);
  }

  update(id: number, payload: LegalEntityRequest): Observable<ApiResponse<LegalEntity>> {
    return this.api.put(AppConstants.API.LEGAL_ENTITY_BY_ID(id), payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(AppConstants.API.LEGAL_ENTITY_BY_ID(id));
  }
}
