import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { User } from '../models/user.model';

export interface UserProfileUpdateRequest {
  fullName?: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
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
    return this.api.get('/users/me');
  }

  updateMyProfile(payload: UserProfileUpdateRequest): Observable<ApiResponse<User>> {
    return this.api.put('/users/me', payload);
  }

  changeMyPassword(payload: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.api.put('/users/me/change-password', payload);
  }
}
