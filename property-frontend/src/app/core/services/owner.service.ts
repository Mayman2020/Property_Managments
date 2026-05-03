import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { User } from '../models/user.model';

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
  private readonly apiUrl = `${environment.apiUrl}/owners`;

  constructor(private readonly http: HttpClient) {}

  getAll(page = 0, size = 20): Observable<ApiResponse<PagedResponse<Owner>>> {
    return this.http.get<ApiResponse<PagedResponse<Owner>>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  getById(id: number): Observable<ApiResponse<Owner>> {
    return this.http.get<ApiResponse<Owner>>(`${this.apiUrl}/${id}`);
  }

  create(req: OwnerRequest): Observable<ApiResponse<Owner>> {
    return this.http.post<ApiResponse<Owner>>(this.apiUrl, req);
  }

  update(id: number, req: OwnerRequest): Observable<ApiResponse<Owner>> {
    return this.http.put<ApiResponse<Owner>>(`${this.apiUrl}/${id}`, req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  linkUser(id: number, req: LinkUserRequest): Observable<ApiResponse<Owner>> {
    return this.http.patch<ApiResponse<Owner>>(`${this.apiUrl}/${id}/link-user`, req);
  }

  getOwnerUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/owner-users`);
  }
}
