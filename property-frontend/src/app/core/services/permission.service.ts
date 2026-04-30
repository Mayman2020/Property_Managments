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

export interface PropertyModuleSettingDto {
  propertyId?: number;
  moduleKey: string;
  enabled: boolean;
}

export interface ModuleDefinitionDto {
  moduleKey: string;
  titleAr: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string;
  requiredModules?: string[];
  recommendedModules?: string[];
  monthlyPrice?: number;
  displayOrder?: number;
}

export interface ModulePresetDto {
  presetCode: string;
  presetNameAr: string;
  presetNameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  displayOrder?: number;
  modules: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissions: PermissionMap = {};
  private screenSettings: Record<string, boolean> = {};
  private propertyModules: Record<string, boolean> = {};

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
      screenRes: this.api.get<ApiResponse<ScreenSettingDto[]>>('/screen-settings'),
      propertyModuleRes: this.api.get<ApiResponse<PropertyModuleSettingDto[]>>('/property-modules/me')
    }).pipe(
      tap(({ permissionRes, screenRes, propertyModuleRes }) => {
        const permissions = permissionRes.data?.permissions ?? {};
        this.permissions = permissions;
        this.screenSettings = this.toScreenMap(screenRes.data ?? []);
        this.propertyModules = this.toPropertyModuleMap(propertyModuleRes.data ?? []);
        this.auth.updateStoredPermissions(permissions);
        this.auth.updateStoredClientModules(this.propertyModules);
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

  getMyPropertyModules(): Observable<ApiResponse<PropertyModuleSettingDto[]>> {
    return this.api.get<ApiResponse<PropertyModuleSettingDto[]>>('/property-modules/me');
  }

  getModuleDefinitions(): Observable<ApiResponse<ModuleDefinitionDto[]>> {
    return this.api.get<ApiResponse<ModuleDefinitionDto[]>>('/module-catalog/definitions');
  }

  getModulePresets(): Observable<ApiResponse<ModulePresetDto[]>> {
    return this.api.get<ApiResponse<ModulePresetDto[]>>('/module-catalog/presets');
  }

  getPropertyModules(propertyId: number): Observable<ApiResponse<PropertyModuleSettingDto[]>> {
    return this.api.get<ApiResponse<PropertyModuleSettingDto[]>>(`/property-modules/property/${propertyId}`);
  }

  updatePropertyModules(propertyId: number, modules: Record<string, boolean>): Observable<ApiResponse<PropertyModuleSettingDto[]>> {
    return this.api.put<ApiResponse<PropertyModuleSettingDto[]>>(`/property-modules/property/${propertyId}`, { modules }).pipe(
      tap((res) => {
        const currentUser = this.auth.getCurrentUser();
        if (currentUser?.propertyId === propertyId) {
          this.setPropertyModules(res.data ?? []);
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

  setPropertyModules(items: PropertyModuleSettingDto[]): void {
    this.propertyModules = this.toPropertyModuleMap(items ?? []);
    this.auth.updateStoredClientModules(this.propertyModules);
  }

  isScreenEnabled(moduleKey: string): boolean {
    return this.screenSettings[moduleKey] !== false;
  }

  isPropertyModuleEnabled(moduleKey: string): boolean {
    if (this.auth.isSuperAdmin()) return true;
    const resolvedKey = this.resolveModuleKey(moduleKey);
    return this.propertyModules[resolvedKey] !== false;
  }

  isModuleAccessible(moduleKey: string, action: PermissionAction = 'view'): boolean {
    return this.can(moduleKey, action);
  }

  can(moduleKey: string, action: PermissionAction = 'view'): boolean {
    if (!this.isScreenEnabled(moduleKey)) return false;
    if (!this.isPropertyModuleEnabled(moduleKey)) return false;
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

  private toPropertyModuleMap(items: PropertyModuleSettingDto[]): Record<string, boolean> {
    return (items ?? []).reduce<Record<string, boolean>>((acc, item) => {
      acc[item.moduleKey] = !!item.enabled;
      return acc;
    }, {});
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
}
