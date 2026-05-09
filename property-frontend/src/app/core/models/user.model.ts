export type UserRole =
  | 'SUPER_ADMIN'
  | 'GENERAL_MANAGER'
  | 'ACCOUNTANT'
  | 'MAINTENANCE_OFFICER_INTERNAL'
  | 'MAINTENANCE_OFFICER_COMPANY'
  | 'MAINTENANCE_COMPANY'
  | 'PROPERTY_GUARD'
  | 'PROCEDURES_CLERK'
  | 'OWNER'
  | 'TENANT';

/** Mirror of backend {@code UserRole} — for validation only; labels/order for UI come from lookups. */
export const USER_ROLE_VALUES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'GENERAL_MANAGER',
  'ACCOUNTANT',
  'MAINTENANCE_OFFICER_INTERNAL',
  'MAINTENANCE_OFFICER_COMPANY',
  'MAINTENANCE_COMPANY',
  'PROPERTY_GUARD',
  'PROCEDURES_CLERK',
  'OWNER',
  'TENANT'
];

const USER_ROLE_CODE_SET = new Set<string>(USER_ROLE_VALUES as readonly string[]);

/** True if {@code code} is a known portal/system role (same as backend enum name). */
export function isUserRoleCode(code: string | null | undefined): code is UserRole {
  return !!code && USER_ROLE_CODE_SET.has(code);
}

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

/** Active properties linked to an owner (from backend merge). */
export interface OwnerPropertyBrief {
  id: number;
  propertyName?: string;
  propertyNameAr?: string;
  propertyNameEn?: string;
  propertyCode?: string;
}

/** Registry fields for TENANT users — synced with `tenants` row. */
export interface TenantProfileLink {
  fullNameAr?: string;
  fullNameEn?: string;
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
  fullNameAr?: string;
  fullNameEn?: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  /** Additional portal roles merged with the primary role. */
  extraRoles?: UserRole[];
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
  /** Populated for OWNER: properties where this owner is primary or co-owner. */
  ownerProperties?: OwnerPropertyBrief[];
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
  fullNameAr?: string;
  fullNameEn?: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  role: UserRole;
  /** Role currently selected in UI context (defaults to primary role on login). */
  activeRole?: UserRole;
  extraRoles?: UserRole[];
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
  /** When true the user must change their temporary password before using the app. */
  mustChangePassword?: boolean;
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
    fullNameAr?: string;
    fullNameEn?: string;
    profileImageUrl?: string;
    bio?: string;
    role: UserRole;
    extraRoles?: UserRole[];
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
    mustChangePassword?: boolean;
  };
}
