import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { JwtUtils } from '../utils/jwt-utils';
import { ApiResponse } from '../models/api-response.model';
import { CurrentUser, LoginRequest, LoginResponse, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(
    private readonly api: ApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router
  ) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.api.post<ApiResponse<LoginResponse>>('/auth/login', request).pipe(
      tap((res) => {
        if (res.data?.accessToken) {
          this.tokenStorage.setToken(res.data.accessToken);
          if (res.data.refreshToken) this.tokenStorage.setRefreshToken(res.data.refreshToken);
          const userDto = res.data.user;
          if (!userDto) return;
          const user: CurrentUser = {
            id: userDto.id,
            username: userDto.username,
            email: userDto.email,
            fullName: userDto.fullName,
            profileImageUrl: userDto.profileImageUrl,
            bio: userDto.bio,
            role: userDto.role,
            propertyId: userDto.propertyId,
            initials: this.buildInitials(userDto.fullName)
          };
          this.tokenStorage.setUser(user);
        }
      }),
      map((res) => {
        if (!res.success || !res.data) throw new Error(res.message || 'Login failed');
        return res.data;
      })
    );
  }

  logout(): void {
    this.tokenStorage.clearAll();
    void this.router.navigateByUrl('/auth/login');
  }

  isAuthenticated(): boolean {
    const token = this.tokenStorage.getToken();
    if (!token) return false;
    return !JwtUtils.isExpired(token);
  }

  getCurrentUser(): CurrentUser | null {
    return this.tokenStorage.getUser<CurrentUser>();
  }

  getRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user?.role ?? null;
  }

  isSuperAdmin(): boolean { return this.getRole() === 'SUPER_ADMIN'; }
  isPropertyAdmin(): boolean { return this.getRole() === 'PROPERTY_ADMIN'; }
  isOfficer(): boolean { return this.getRole() === 'MAINTENANCE_OFFICER'; }
  isTenant(): boolean { return this.getRole() === 'TENANT'; }
  isAdmin(): boolean { return this.isSuperAdmin() || this.isPropertyAdmin(); }

  getDashboardRoute(): string {
    const role = this.getRole();
    switch (role) {
      case 'SUPER_ADMIN':
      case 'PROPERTY_ADMIN': return '/admin/dashboard';
      case 'MAINTENANCE_OFFICER': return '/officer/requests';
      case 'TENANT': return '/tenant/dashboard';
      default: return '/auth/login';
    }
  }

  clearExpiredTokens(): void {
    const token = this.tokenStorage.getToken();
    if (token && JwtUtils.isExpired(token)) this.tokenStorage.clearAll();
  }

  private buildInitials(name: string): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  }
}
