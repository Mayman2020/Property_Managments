import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { TokenStorageService } from '../auth/token-storage.service';
import { JwtUtils } from '../utils/jwt-utils';
import { normalizeFileUrlsInValue } from '../utils/file-url-utils';
import { ApiResponse } from '../models/api-response.model';
import { ClientModuleMap, CurrentUser, LoginRequest, LoginResponse, PermissionMap, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly activeRoleChanged$ = new Subject<void>();
  /** Fires after {@link setActiveRole} so pages can reload data scoped to the new role. */
  readonly activeRoleChanged = this.activeRoleChanged$.asObservable();

  constructor(
    private readonly api: ApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router
  ) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    const email = request.email?.trim();
    const payload: LoginRequest = { ...request, email, username: email };
    return this.api.post<ApiResponse<LoginResponse>>(AppConstants.API.AUTH_LOGIN, payload).pipe(
      tap((res) => {
        if (res.data?.accessToken) {
          this.tokenStorage.setToken(res.data.accessToken);
          if (res.data.refreshToken) this.tokenStorage.setRefreshToken(res.data.refreshToken);
          const userDto = res.data.user;
          if (!userDto) return;
          const extraRoles = Array.isArray(userDto.extraRoles) ? (userDto.extraRoles as UserRole[]) : [];
          const defaultActiveRole = this.resolveDefaultActiveRole(userDto.role, extraRoles);
          const user: CurrentUser = {
            id: userDto.id,
            username: userDto.username,
            email: userDto.email,
            fullName: userDto.fullName,
            fullNameAr: userDto.fullNameAr,
            fullNameEn: userDto.fullNameEn,
            profileImageUrl: userDto.profileImageUrl,
            bio: userDto.bio,
            role: userDto.role,
            activeRole: defaultActiveRole,
            extraRoles,
            propertyId: userDto.propertyId,
            ownerId: userDto.ownerId,
            tenantId: userDto.tenantId,
            civilIdImageUrl: userDto.civilIdImageUrl,
            leaseContractFiles: userDto.leaseContractFiles,
            maintenanceOfficerType: userDto.maintenanceOfficerType,
            maintenanceCompanyName: userDto.maintenanceCompanyName,
            contractorCompanyId: userDto.contractorCompanyId,
            permissions: userDto.permissions,
            clientModules: userDto.clientModules,
            initials: this.buildInitials(userDto.fullNameAr || userDto.fullNameEn || userDto.fullName),
            mustChangePassword: userDto.mustChangePassword ?? false
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
    this.api.post<ApiResponse<void>>(AppConstants.API.AUTH_LOGOUT, {}).subscribe({ error: () => {} });
    this.tokenStorage.clearAll();
    void this.router.navigateByUrl('/auth/login');
  }

  isAuthenticated(): boolean {
    const token = this.tokenStorage.getToken();
    if (!token) return false;
    return !JwtUtils.isExpired(token);
  }

  getCurrentUser(): CurrentUser | null {
    const user = this.tokenStorage.getUser<CurrentUser>();
    if (!user) return null;
    const normalized = normalizeFileUrlsInValue(user);
    if (normalized !== user) this.tokenStorage.setUser(normalized);
    return normalized;
  }

  getRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user?.activeRole ?? user?.role ?? null;
  }

  /** Primary role first, then extras; unique. */
  getEffectiveRoles(): UserRole[] {
    const u = this.getCurrentUser();
    if (!u) return [];
    const out: UserRole[] = [];
    const seen = new Set<UserRole>();
    for (const r of [u.role, ...(u.extraRoles ?? [])]) {
      if (r && !seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
    return out;
  }

  hasRole(role: UserRole): boolean {
    return this.getRole() === role;
  }

  hasAssignedRole(role: UserRole): boolean {
    return this.getEffectiveRoles().includes(role);
  }

  /** UI role switching for multi-role users (does not change assigned roles). */
  setActiveRole(role: UserRole): void {
    const user = this.getCurrentUser();
    if (!user) return;
    const allowed = this.getEffectiveRoles();
    if (!allowed.includes(role)) return;
    this.tokenStorage.setUser({ ...user, activeRole: role });
    this.activeRoleChanged$.next();
  }

  getPermissions(): PermissionMap {
    return this.getCurrentUser()?.permissions ?? {};
  }

  updateStoredPermissions(permissions: PermissionMap): void {
    const user = this.getCurrentUser();
    if (!user) return;
    this.tokenStorage.setUser({ ...user, permissions });
  }

  updateStoredClientModules(clientModules: ClientModuleMap): void {
    const user = this.getCurrentUser();
    if (!user) return;
    this.tokenStorage.setUser({ ...user, clientModules });
  }

  isSuperAdmin(): boolean { return this.hasRole('SUPER_ADMIN'); }
  /** المدير العام */
  isGeneralManager(): boolean { return this.hasRole('GENERAL_MANAGER'); }
  /** @deprecated use {@link isGeneralManager} */
  isPropertyAdmin(): boolean { return this.isGeneralManager(); }
  isOfficer(): boolean {
    return (
      this.hasRole('MAINTENANCE_OFFICER_INTERNAL') ||
      this.hasRole('MAINTENANCE_OFFICER_COMPANY') ||
      this.hasRole('MAINTENANCE_COMPANY')
    );
  }
  isTenant(): boolean { return this.hasRole('TENANT'); }
  isAccountant(): boolean { return this.hasRole('ACCOUNTANT'); }
  isProceduresClerk(): boolean { return this.hasRole('PROCEDURES_CLERK'); }
  isPropertyGuard(): boolean { return this.hasRole('PROPERTY_GUARD'); }
  isOwner(): boolean { return this.hasRole('OWNER'); }
  isAdmin(): boolean {
    return this.isSuperAdmin()
      || this.isGeneralManager()
      || this.isAccountant()
      || this.isOfficer()
      || this.isPropertyGuard()
      || this.isProceduresClerk()
      || this.isOwner();
  }

  getDashboardRoute(): string {
    const activeRole = this.getRole();
    const roles = activeRole ? [activeRole] : this.getEffectiveRoles();
    const seen = new Set<string>();
    const merged: Array<{ route: string; permission: string; action: keyof NonNullable<PermissionMap[string]> }> = [];
    for (const role of roles) {
      for (const c of this.roleLandingCandidates(role)) {
        if (!seen.has(c.route)) {
          seen.add(c.route);
          merged.push(c);
        }
      }
    }
    const firstAllowed = merged.find((item) => this.hasPermission(item.permission, item.action));
    if (firstAllowed) return firstAllowed.route;

    if (roles.some((r) => ['SUPER_ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'PROCEDURES_CLERK', 'PROPERTY_GUARD', 'OWNER'].includes(r))) {
      return '/admin/home';
    }
    if (
      roles.some(
        (r) =>
          r === 'MAINTENANCE_OFFICER_INTERNAL' ||
          r === 'MAINTENANCE_OFFICER_COMPANY' ||
          r === 'MAINTENANCE_COMPANY'
      )
    ) {
      return '/officer/schedule';
    }
    if (roles.includes('TENANT')) return '/tenant/my-unit';
    return '/auth/login';
  }

  mustChangePassword(): boolean {
    return this.getCurrentUser()?.mustChangePassword === true;
  }

  /** Called after a successful password change to clear the flag and update stored user. */
  clearMustChangePassword(): void {
    const user = this.getCurrentUser();
    if (user) this.tokenStorage.setUser({ ...user, mustChangePassword: false });
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

  private resolveDefaultActiveRole(primaryRole: UserRole, extraRoles: UserRole[]): UserRole {
    const assigned = new Set<UserRole>([primaryRole, ...(extraRoles ?? [])]);
    if (assigned.has('GENERAL_MANAGER')) {
      return 'GENERAL_MANAGER';
    }
    return primaryRole;
  }

  private hasPermission(moduleKey: string, action: keyof NonNullable<PermissionMap[string]>): boolean {
    if (this.isSuperAdmin()) return true;
    if (!this.isModuleEnabled(moduleKey)) return false;
    const module = this.getPermissions()?.[moduleKey];
    if (!module || module.enabled === false) return false;
    return module[action] === true;
  }

  private isModuleEnabled(moduleKey: string): boolean {
    if (this.isSuperAdmin()) return true;
    return this.getCurrentUser()?.clientModules?.[this.resolveModuleKey(moduleKey)] !== false;
  }

  private resolveModuleKey(moduleKey: string): string {
    switch (moduleKey) {
      case 'schedule':
      case 'new_request':
      case 'my_requests':
        return 'maintenance';
      default:
        return moduleKey;
    }
  }

  private roleLandingCandidates(role: UserRole | null): Array<{ route: string; permission: string; action: keyof NonNullable<PermissionMap[string]> }> {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'GENERAL_MANAGER':
        return [
          { route: '/admin/home', permission: 'dashboard', action: 'view' },
          { route: '/admin/dashboard', permission: 'dashboard', action: 'view' },
          { route: '/admin/maintenance', permission: 'maintenance', action: 'view' },
          { route: '/admin/properties', permission: 'properties', action: 'view' },
          { route: '/admin/profile', permission: 'profile', action: 'view' }
        ];
      case 'MAINTENANCE_OFFICER_INTERNAL':
      case 'MAINTENANCE_OFFICER_COMPANY':
      case 'MAINTENANCE_COMPANY':
        return [
          { route: '/officer/schedule', permission: 'schedule', action: 'view' },
          { route: '/officer/requests', permission: 'my_requests', action: 'view' },
          { route: '/officer/profile', permission: 'profile', action: 'view' }
        ];
      case 'ACCOUNTANT':
        return [
          { route: '/admin/home', permission: 'finance', action: 'view' },
          { route: '/admin/finance/dashboard', permission: 'finance', action: 'view' },
          { route: '/admin/contracts/list', permission: 'contracts', action: 'view' },
          { route: '/admin/profile', permission: 'profile', action: 'view' }
        ];
      case 'PROCEDURES_CLERK':
        return [
          { route: '/admin/home', permission: 'hr', action: 'view' },
          { route: '/admin/hr/employees', permission: 'hr', action: 'view' },
          { route: '/admin/profile', permission: 'profile', action: 'view' }
        ];
      case 'PROPERTY_GUARD':
        return [
          { route: '/admin/home', permission: 'dashboard', action: 'view' },
          { route: '/admin/maintenance', permission: 'maintenance', action: 'view' },
          { route: '/admin/profile', permission: 'profile', action: 'view' }
        ];
      case 'OWNER':
        return [
          { route: '/admin/home', permission: 'dashboard', action: 'view' },
          { route: '/admin/dashboard', permission: 'dashboard', action: 'view' },
          { route: '/admin/properties', permission: 'properties', action: 'view' },
          { route: '/admin/owner-portal/dashboard', permission: 'owner_portal', action: 'view' },
          { route: '/admin/owner-portal/contract-approvals', permission: 'owner_portal', action: 'view' },
          { route: '/admin/profile', permission: 'profile', action: 'view' }
        ];
      case 'TENANT':
        return [
          { route: '/tenant/my-unit', permission: 'my_unit', action: 'view' },
          { route: '/tenant/requests', permission: 'my_requests', action: 'view' },
          { route: '/tenant/profile', permission: 'profile', action: 'view' }
        ];
      default:
        return [];
    }
  }
}
