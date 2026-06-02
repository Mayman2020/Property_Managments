import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { withPageParams } from '../utils/pagination.util';
import { User } from '../models/user.model';

export interface OwnerPropertySummary {
  propertyId: number;
  propertyNameAr?: string;
  propertyNameEn?: string;
}

export interface Owner {
  id: number;
  /** Combined display line (e.g. AR / EN); prefer fullNameAr / fullNameEn when present. */
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  address?: string;
  notes?: string;
  active: boolean;
  userId?: number;
  /** Mirrors users.is_active for the linked account; portal login works only if true. */
  linkedUserActive?: boolean;
  portalAccess: boolean;
  properties?: OwnerPropertySummary[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface OwnerRequest {
  fullNameAr: string;
  fullNameEn: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  address?: string;
  notes?: string;
}

/** Localized primary line for lists and autocomplete (lang = 'ar' | 'en'). */
export function ownerDisplayName(o: Owner, lang: string): string {
  const ar = (o.fullNameAr ?? '').trim();
  const en = (o.fullNameEn ?? '').trim();
  if (lang === 'ar') {
    return ar || en || (o.fullName ?? '').trim() || '';
  }
  return en || ar || (o.fullName ?? '').trim() || '';
}

export interface LinkUserRequest {
  userId: number | null;
  portalAccess: boolean;
}

@Injectable({ providedIn: 'root' })
export class OwnerService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 20, propertyId?: number | null): Observable<ApiResponse<PagedResponse<Owner>>> {
    return this.api.get<ApiResponse<PagedResponse<Owner>>>(AppConstants.API.OWNERS, withPageParams(page, size, {
      propertyId: propertyId != null ? propertyId : undefined
    }));
  }

  getById(id: number): Observable<ApiResponse<Owner>> {
    return this.api.get<ApiResponse<Owner>>(AppConstants.API.OWNER_BY_ID(id));
  }

  create(req: OwnerRequest): Observable<ApiResponse<Owner>> {
    return this.api.post<ApiResponse<Owner>>(AppConstants.API.OWNERS, req);
  }

  update(id: number, req: OwnerRequest): Observable<ApiResponse<Owner>> {
    return this.api.put<ApiResponse<Owner>>(AppConstants.API.OWNER_BY_ID(id), req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(AppConstants.API.OWNER_BY_ID(id));
  }

  linkUser(id: number, req: LinkUserRequest): Observable<ApiResponse<Owner>> {
    return this.api.patch<ApiResponse<Owner>>(AppConstants.API.OWNER_LINK_USER(id), req);
  }

  getOwnerUsers(): Observable<ApiResponse<User[]>> {
    return this.api.get<ApiResponse<User[]>>(AppConstants.API.OWNERS_OWNER_USERS);
  }
}
