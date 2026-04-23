import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { PermissionAction, PermissionMap, UserRole } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';

export interface RolePermissionDto {
  role: UserRole;
  permissions: PermissionMap;
}

export interface RolePermissionUpdateRequest {
  permissions: PermissionMap;
}

export interface ScreenSettingDto {
  screenKey: string;
  globallyEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissions: PermissionMap = {};
  private screenSettings: Record<string, boolean> = {};

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService
  ) {
    this.permissions = this.auth.getPermissions();
  }

  loadMine(): Observable<ApiResponse<RolePermissionDto> | null> {
    if (!this.auth.isAuthenticated()) return of(null);
    return forkJoin({
      permissionRes: this.api.get<ApiResponse<RolePermissionDto>>('/role-permissions/me'),
      screenRes: this.api.get<ApiResponse<ScreenSettingDto[]>>('/screen-settings')
    }).pipe(
      tap(({ permissionRes, screenRes }) => {
        const permissions = permissionRes.data?.permissions ?? {};
        this.permissions = permissions;
        this.screenSettings = this.toScreenMap(screenRes.data ?? []);
        this.auth.updateStoredPermissions(permissions);
      }),
      map(({ permissionRes }) => permissionRes)
    );
  }

  getAll(): Observable<ApiResponse<RolePermissionDto[]>> {
    return this.api.get<ApiResponse<RolePermissionDto[]>>('/role-permissions');
  }

  update(role: UserRole, payload: RolePermissionUpdateRequest): Observable<ApiResponse<RolePermissionDto>> {
    return this.api.put<ApiResponse<RolePermissionDto>>(`/role-permissions/${role}`, payload);
  }

  getScreenSettings(): Observable<ApiResponse<ScreenSettingDto[]>> {
    return this.api.get<ApiResponse<ScreenSettingDto[]>>('/screen-settings');
  }

  updateScreenSetting(screenKey: string, globallyEnabled: boolean): Observable<ApiResponse<ScreenSettingDto>> {
    return this.api.put<ApiResponse<ScreenSettingDto>>(`/screen-settings/${screenKey}`, { globallyEnabled }).pipe(
      tap((res) => {
        if (res.data?.screenKey) {
          this.screenSettings[res.data.screenKey] = !!res.data.globallyEnabled;
        }
      })
    );
  }

  setPermissions(permissions: PermissionMap): void {
    this.permissions = permissions ?? {};
    this.auth.updateStoredPermissions(this.permissions);
  }

  getPermissions(): PermissionMap {
    return this.permissions;
  }

  setScreenSettings(items: ScreenSettingDto[]): void {
    this.screenSettings = this.toScreenMap(items ?? []);
  }

  isScreenEnabled(moduleKey: string): boolean {
    return this.screenSettings[moduleKey] !== false;
  }

  can(moduleKey: string, action: PermissionAction = 'view'): boolean {
    if (!this.isScreenEnabled(moduleKey)) return false;
    const module = this.permissions[moduleKey];
    if (!module) return this.auth.isSuperAdmin();
    if (module.enabled === false) return false;
    return module[action] === true || this.auth.isSuperAdmin();
  }

  private toScreenMap(items: ScreenSettingDto[]): Record<string, boolean> {
    return (items ?? []).reduce<Record<string, boolean>>((acc, item) => {
      acc[item.screenKey] = !!item.globallyEnabled;
      return acc;
    }, {});
  }
}
