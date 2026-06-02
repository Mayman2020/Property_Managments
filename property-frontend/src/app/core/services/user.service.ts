import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { withPageParams } from '../utils/pagination.util';
import {
  EmployeeProfileLink,
  MaintenanceOfficerType,
  OwnerProfileLink,
  TenantProfileLink,
  User,
  UserRole
} from '../models/user.model';

export interface UserManageRequest {
  username: string;
  email: string;
  password?: string;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  phone?: string;
  profileImageUrl?: string;
  civilIdImageUrl?: string;
  bio?: string;
  role: UserRole;
  propertyId?: number;
  maintenanceOfficerType?: MaintenanceOfficerType;
  maintenanceCompanyName?: string;
  contractorCompanyId?: number;
  ownerLink?: OwnerProfileLink;
  tenantLink?: TenantProfileLink;
  employeeLink?: EmployeeProfileLink;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly api: ApiService) {}

  getById(id: number): Observable<ApiResponse<User>> {
    return this.api.get<ApiResponse<User>>(AppConstants.API.USER_BY_ID(id)).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  getAll(page = 0, size = 20, q?: string, role?: UserRole): Observable<ApiResponse<PagedResponse<User>>> {
    return this.api.get<ApiResponse<PagedResponse<User>>>(AppConstants.API.USERS, withPageParams(page, size, {
      q: q?.trim() || undefined,
      role
    })).pipe(
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
    return this.api.post<ApiResponse<User>>(AppConstants.API.USERS, payload).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  update(id: number, payload: UserManageRequest): Observable<ApiResponse<User>> {
    return this.api.put<ApiResponse<User>>(AppConstants.API.USER_BY_ID(id), payload).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  toggleActive(id: number): Observable<ApiResponse<User>> {
    return this.api.patch<ApiResponse<User>>(AppConstants.API.USERS_TOGGLE_ACTIVE(id)).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(AppConstants.API.USER_BY_ID(id));
  }

  updateRole(id: number, role: UserRole): Observable<ApiResponse<User>> {
    return this.updateRoles(id, [role]);
  }

  updateRoles(id: number, roles: UserRole[]): Observable<ApiResponse<User>> {
    return this.api.patch<ApiResponse<User>>(AppConstants.API.USERS_ROLE(id), { roles }).pipe(
      map((res) => ({ ...res, data: res.data ? this.normalizeUser(res.data) : res.data }))
    );
  }

  getMaintenanceAssignableContractors(
    propertyId: number,
    contractorCompanyId: number
  ): Observable<ApiResponse<User[]>> {
    return this.api.get<ApiResponse<User[]>>(AppConstants.API.USERS_MAINTENANCE_ASSIGNABLE_CONTRACTOR, {
      propertyId,
      contractorCompanyId
    });
  }

  private normalizeUser(user: User & { active?: boolean }): User {
    const isActive = typeof user.isActive === 'boolean' ? user.isActive : !!user.active;
    const extraRoles = Array.isArray(user.extraRoles) ? (user.extraRoles as UserRole[]) : [];
    return {
      ...user,
      isActive,
      extraRoles
    };
  }
}
