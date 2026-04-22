export type UserRole = 'SUPER_ADMIN' | 'PROPERTY_ADMIN' | 'MAINTENANCE_OFFICER' | 'TENANT';
export type MaintenanceOfficerType = 'INTERNAL_PROPERTY' | 'CONTRACTOR_COMPANY';

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
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
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
  initials: string;
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
  };
}
