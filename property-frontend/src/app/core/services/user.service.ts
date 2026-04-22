import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  getAll(page = 0, size = 50): Observable<ApiResponse<PagedResponse<User>>> {
    return this.api.get('/users', { page, size });
  }

  create(payload: UserManageRequest): Observable<ApiResponse<User>> {
    return this.api.post('/users', payload);
  }

  update(id: number, payload: UserManageRequest): Observable<ApiResponse<User>> {
    return this.api.put(`/users/${id}`, payload);
  }

  toggleActive(id: number): Observable<ApiResponse<User>> {
    return this.api.patch(`/users/${id}/toggle-active`);
  }
}
