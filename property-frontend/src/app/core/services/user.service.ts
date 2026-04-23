import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { MaintenanceOfficerType, User, UserRole } from '../models/user.model';

export interface UserManageRequest {
  username: string;
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  propertyId?: number;
  maintenanceOfficerType?: MaintenanceOfficerType;
  maintenanceCompanyName?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly api: ApiService) {}

  getAll(page = 0, size = 50, q?: string, role?: UserRole): Observable<ApiResponse<PagedResponse<User>>> {
    const params: Record<string, string | number | boolean> = { page, size };
    if (q && q.trim()) params['q'] = q.trim();
    if (role) params['role'] = role;
    return this.api.get<ApiResponse<PagedResponse<User>>>('/users', params).pipe(
      map((res) => ({
        ...res,
        data: res.data
          ? {
              ...res.data,
              content: (res.data.content ?? []).map((u) => this.normalizeUser(u))
            }
          : res.data
      }))
    );
  }

  create(payload: UserManageRequest): Observable<ApiResponse<User>> {
    return this.api.post<ApiResponse<User>>('/users', payload).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  update(id: number, payload: UserManageRequest): Observable<ApiResponse<User>> {
    return this.api.put<ApiResponse<User>>(`/users/${id}`, payload).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  toggleActive(id: number): Observable<ApiResponse<User>> {
    return this.api.patch<ApiResponse<User>>(`/users/${id}/toggle-active`).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  updateRole(id: number, role: UserRole): Observable<ApiResponse<User>> {
    return this.api.patch<ApiResponse<User>>(`/users/${id}/role`, { role }).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  private normalizeUser(user: User & { active?: boolean }): User {
    const isActive = typeof user.isActive === 'boolean' ? user.isActive : !!user.active;
    return {
      ...user,
      isActive
    };
  }
}
