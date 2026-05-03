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

/** Registry fields for OWNER users — synced with `owners` row. */
export interface OwnerProfileLink {
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  address?: string;
  notes?: string;
}

/** Registry fields for TENANT users — synced with `tenants` row. */
export interface TenantProfileLink {
  nationalId?: string;
  leaseStart?: string | null;
  leaseEnd?: string | null;
  notes?: string;
}

/** Registry fields for staff linked to `employees` (by email). */
export interface EmployeeProfileLink {
  nationalId?: string;
  jobTitleAr?: string;
  jobTitleEn?: string;
}

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
  /** Backend: owners.id when this login is an owner user linked to an owners row */
  ownerId?: number;
  /** Backend: tenants.id when this login is a tenant user linked to a lease */
  tenantId?: number;
  /** From owner/employee record when not on users row */
  civilIdImageUrl?: string;
  /** From tenant record: lease contract URLs */
  leaseContractFiles?: string[];
  ownerLink?: OwnerProfileLink;
  tenantLink?: TenantProfileLink;
  employeeLink?: EmployeeProfileLink;
  maintenanceOfficerType?: MaintenanceOfficerType;
  maintenanceCompanyName?: string;
  contractorCompanyId?: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
  permissions?: PermissionMap;
  clientModules?: ClientModuleMap;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  propertyId?: number;
  ownerId?: number;
  tenantId?: number;
  civilIdImageUrl?: string;
  leaseContractFiles?: string[];
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
    ownerId?: number;
    tenantId?: number;
    civilIdImageUrl?: string;
    leaseContractFiles?: string[];
    maintenanceOfficerType?: MaintenanceOfficerType;
    maintenanceCompanyName?: string;
    contractorCompanyId?: number;
    permissions?: PermissionMap;
    clientModules?: ClientModuleMap;
  };
}
