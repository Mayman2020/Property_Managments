export type UserRole =
  | 'SUPER_ADMIN'
  | 'PROPERTY_ADMIN'
  | 'MAINTENANCE_OFFICER'
  | 'CONTRACTS_OFFICER'
  | 'ACCOUNTANT'
  | 'HR_OFFICER'
  | 'OWNER'
  | 'TENANT';
export type MaintenanceOfficerType = 'INTERNAL_PROPERTY' | 'CONTRACTOR_COMPANY';
export type PermissionAction =
  | 'enabled'
  | 'menu'
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'assign'
  | 'schedule'
  | 'start'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'export'
  | 'rate'
  | 'manage'
  | 'toggle';

export type ModulePermissions = Record<PermissionAction, boolean>;
export type PermissionMap = Record<string, ModulePermissions>;
export type ClientModuleMap = Record<string, boolean>;

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  propertyId?: number;
  /** Backend: tenants.id when this login is a tenant user linked to a lease */
  tenantId?: number;
  maintenanceOfficerType?: MaintenanceOfficerType;
  maintenanceCompanyName?: string;
  contractorCompanyId?: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  permissions?: PermissionMap;
  clientModules?: ClientModuleMap;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  propertyId?: number;
  tenantId?: number;
  maintenanceOfficerType?: MaintenanceOfficerType;
  maintenanceCompanyName?: string;
  contractorCompanyId?: number;
  initials: string;
  permissions?: PermissionMap;
  clientModules?: ClientModuleMap;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
    bio?: string;
    role: UserRole;
    propertyId?: number;
    tenantId?: number;
    maintenanceOfficerType?: MaintenanceOfficerType;
    maintenanceCompanyName?: string;
    contractorCompanyId?: number;
    permissions?: PermissionMap;
    clientModules?: ClientModuleMap;
  };
}
