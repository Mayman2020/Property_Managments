import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';
import { EmployeeProfileLink, OwnerProfileLink, TenantProfileLink, User } from '../models/user.model';

export interface UserProfileUpdateRequest {
  fullName?: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  civilIdImageUrl?: string;
  leaseContractFiles?: string[];
  ownerLink?: OwnerProfileLink;
  tenantLink?: TenantProfileLink;
  employeeLink?: EmployeeProfileLink;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  constructor(private readonly api: ApiService) {}

  getMyProfile(): Observable<ApiResponse<User>> {
    return this.api.get(AppConstants.API.USERS_ME);
  }

  updateMyProfile(payload: UserProfileUpdateRequest): Observable<ApiResponse<User>> {
    return this.api.put(AppConstants.API.USERS_ME, payload);
  }

  changeMyPassword(payload: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.api.put(AppConstants.API.USERS_ME_CHANGE_PASSWORD, payload);
  }
}
