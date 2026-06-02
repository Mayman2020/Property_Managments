import { RoleKey } from './credentials';

export interface RouteSpec {
  module: string;
  path: string;
  /** Roles expected to load the route without redirect to login or forbidden page. */
  allow: RoleKey[];
  /** Roles expected to be redirected (or to receive a forbidden page). */
  deny?: RoleKey[];
  /** If true, this path expects a route param the bootstrap step resolves. */
  paramKind?: 'contractId' | 'maintenanceId' | 'inspectionId' | 'vacancyId' | 'employeeId' | 'payrollId' | 'contractorId';
}

const ADMIN: RoleKey[] = ['SUPER_ADMIN', 'GENERAL_MANAGER'];
const ACCT: RoleKey[] = ['SUPER_ADMIN', 'ACCOUNTANT'];
const HR: RoleKey[] = ['SUPER_ADMIN', 'HR_OFFICER'];

export const ROUTES: RouteSpec[] = [
  // Auth + shared
  { module: 'auth', path: '/auth/login', allow: ['SUPER_ADMIN', 'TENANT', 'OWNER'] /* anyone */ },
  { module: 'auth', path: '/change-password', allow: ['SUPER_ADMIN', 'TENANT', 'OWNER'] },

  // Admin/shared
  { module: 'dashboard', path: '/admin/dashboard', allow: ADMIN, deny: ['TENANT'] },
  { module: 'properties', path: '/admin/properties', allow: ADMIN, deny: ['TENANT'] },
  { module: 'units', path: '/admin/units', allow: ADMIN, deny: ['TENANT'] },
  { module: 'tenants', path: '/admin/tenants', allow: ADMIN, deny: ['TENANT'] },
  { module: 'maintenance', path: '/admin/maintenance', allow: [...ADMIN, 'MAINTENANCE_OFFICER_INTERNAL'], deny: ['TENANT'] },
  { module: 'maintenance', path: '/admin/my-requests', allow: ADMIN },
  { module: 'maintenance', path: '/admin/maintenance/new', allow: ADMIN },
  { module: 'maintenance', path: '/admin/maintenance/:id', allow: ADMIN, paramKind: 'maintenanceId' },
  { module: 'inventory', path: '/admin/inventory', allow: ADMIN, deny: ['TENANT'] },
  { module: 'reports', path: '/admin/reports', allow: ADMIN },
  { module: 'reports', path: '/admin/reports/contract-expiry', allow: ADMIN },
  { module: 'reports', path: '/admin/reports/occupancy', allow: ADMIN },
  { module: 'reports', path: '/admin/reports/maintenance', allow: ADMIN },
  { module: 'reports', path: '/admin/reports/budget-vs-actual', allow: ADMIN },
  { module: 'users', path: '/admin/users', allow: ['SUPER_ADMIN'], deny: ['TENANT', 'OWNER'] },
  { module: 'users', path: '/admin/legal-entities', allow: ['SUPER_ADMIN'] },
  { module: 'permissions', path: '/admin/user-access', allow: ['SUPER_ADMIN'] },
  { module: 'permissions', path: '/admin/screens', allow: ['SUPER_ADMIN'] },
  { module: 'permissions', path: '/admin/permissions', allow: ['SUPER_ADMIN'] },
  { module: 'settings', path: '/admin/module-settings', allow: ['SUPER_ADMIN'] },
  { module: 'lookups', path: '/admin/lookups', allow: ['SUPER_ADMIN'] },
  { module: 'ratings', path: '/admin/ratings', allow: ADMIN },
  { module: 'contractors', path: '/admin/contractors', allow: ADMIN },
  { module: 'contractors', path: '/admin/contractors/:id', allow: ADMIN, paramKind: 'contractorId' },
  { module: 'owners', path: '/admin/owners', allow: ADMIN },
  { module: 'profile', path: '/admin/profile', allow: ADMIN },
  { module: 'notifications', path: '/admin/notifications', allow: ADMIN },
  { module: 'audit', path: '/admin/audit-log', allow: ['SUPER_ADMIN'] },

  // HR
  { module: 'hr', path: '/admin/hr/employees', allow: HR },
  { module: 'hr', path: '/admin/hr/employees/:id', allow: HR, paramKind: 'employeeId' },
  { module: 'hr', path: '/admin/hr/leaves', allow: HR },
  { module: 'hr', path: '/admin/hr/attendance', allow: HR },
  { module: 'hr', path: '/admin/hr/deductions', allow: HR },
  { module: 'hr', path: '/admin/hr/payroll', allow: HR },
  { module: 'hr', path: '/admin/hr/payroll/:id', allow: HR, paramKind: 'payrollId' },

  // Finance
  { module: 'finance', path: '/admin/finance/dashboard', allow: ACCT },
  { module: 'finance', path: '/admin/finance/expenses', allow: ACCT },
  { module: 'finance', path: '/admin/finance/revenues', allow: ACCT },
  { module: 'finance', path: '/admin/finance/budget', allow: ACCT },
  { module: 'finance', path: '/admin/finance/reports/pnl', allow: ACCT },
  { module: 'finance', path: '/admin/finance/reports/cashflow', allow: ACCT },
  { module: 'finance', path: '/admin/finance/reports/owner-statement', allow: ACCT },
  { module: 'finance', path: '/admin/finance/overdue-payments', allow: ACCT },

  // Inspections / Vacancies / Owner portal / Accountant portal
  { module: 'inspections', path: '/admin/inspections/:id', allow: ADMIN, paramKind: 'inspectionId' },
  { module: 'vacancies', path: '/admin/vacancies/list', allow: ADMIN },
  { module: 'vacancies', path: '/admin/vacancies/:id/inquiries', allow: ADMIN, paramKind: 'vacancyId' },
  { module: 'owner_portal', path: '/admin/owner-portal/dashboard', allow: ['SUPER_ADMIN', 'OWNER'] },
  { module: 'owner_portal', path: '/admin/owner-portal/statements', allow: ['SUPER_ADMIN', 'OWNER'] },
  { module: 'owner_portal', path: '/admin/owner-portal/properties', allow: ['SUPER_ADMIN', 'OWNER'] },
  { module: 'owner_portal', path: '/admin/owner-portal/contract-approvals', allow: ['SUPER_ADMIN', 'OWNER'] },
  { module: 'accountant_portal', path: '/admin/accountant-portal/rent-confirmation', allow: ACCT },
  { module: 'accountant_portal', path: '/admin/owner-portal/contract-approvals?tab=renewals', allow: ACCT },
  { module: 'accountant_portal', path: '/admin/accountant-portal/maintenance-invoices', allow: ACCT },

  // Contracts
  { module: 'contracts', path: '/admin/contracts/dashboard', allow: ADMIN },
  { module: 'contracts', path: '/admin/contracts/list', allow: ADMIN },
  { module: 'contracts', path: '/admin/contracts/templates', allow: ADMIN },
  { module: 'contracts', path: '/admin/contracts/complaints', allow: ADMIN },
  { module: 'contracts', path: '/admin/contracts/:id', allow: ADMIN, paramKind: 'contractId' },
  { module: 'contracts', path: '/admin/contracts/:id/renew', allow: ADMIN, paramKind: 'contractId' },
  { module: 'contracts', path: '/admin/contracts/maintenance/:id', allow: ADMIN, paramKind: 'contractId' },

  // Officer / company
  { module: 'schedule', path: '/officer/schedule', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'SUPER_ADMIN'] },
  { module: 'maintenance', path: '/officer/requests', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'SUPER_ADMIN'] },
  { module: 'maintenance', path: '/officer/my-requests', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'SUPER_ADMIN'] },
  { module: 'maintenance', path: '/officer/requests/:id', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'SUPER_ADMIN'], paramKind: 'maintenanceId' },
  { module: 'maintenance', path: '/officer/requests/:id/visit-report', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'SUPER_ADMIN'], paramKind: 'maintenanceId' },
  { module: 'maintenance', path: '/officer/company-queue', allow: ['MAINTENANCE_COMPANY', 'SUPER_ADMIN'] },
  { module: 'maintenance', path: '/officer/invoices', allow: ['MAINTENANCE_COMPANY', 'SUPER_ADMIN'] },
  { module: 'maintenance', path: '/officer/my-staff', allow: ['MAINTENANCE_COMPANY', 'SUPER_ADMIN'] },
  { module: 'profile', path: '/officer/profile', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY', 'SUPER_ADMIN'] },
  { module: 'notifications', path: '/officer/notifications', allow: ['MAINTENANCE_OFFICER_INTERNAL', 'MAINTENANCE_OFFICER_COMPANY', 'MAINTENANCE_COMPANY', 'SUPER_ADMIN'] },

  // Tenant portal
  { module: 'my_unit', path: '/tenant/my-unit', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'dashboard', path: '/tenant/dashboard', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'contracts', path: '/tenant/my-contracts', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'contracts', path: '/tenant/contracts/:id', allow: ['TENANT', 'SUPER_ADMIN'], paramKind: 'contractId' },
  { module: 'finance', path: '/tenant/rent-receipts', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'contracts', path: '/tenant/complaints', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'notifications', path: '/tenant/notifications', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'contracts', path: '/tenant/contract-request', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'new_request', path: '/tenant/new-request', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'my_requests', path: '/tenant/requests', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'my_requests', path: '/tenant/my-requests', allow: ['TENANT', 'SUPER_ADMIN'] },
  { module: 'maintenance', path: '/tenant/requests/:id', allow: ['TENANT', 'SUPER_ADMIN'], paramKind: 'maintenanceId' },
  { module: 'profile', path: '/tenant/profile', allow: ['TENANT', 'SUPER_ADMIN'] },

  // Employee portal
  { module: 'hr', path: '/employee/my-payslips', allow: ['HR_OFFICER', 'MAINTENANCE_OFFICER_INTERNAL', 'SUPER_ADMIN'] },
  { module: 'hr', path: '/employee/my-payslips/:id', allow: ['HR_OFFICER', 'MAINTENANCE_OFFICER_INTERNAL', 'SUPER_ADMIN'], paramKind: 'payrollId' },
  { module: 'notifications', path: '/employee/notifications', allow: ['HR_OFFICER', 'MAINTENANCE_OFFICER_INTERNAL', 'SUPER_ADMIN'] },
  { module: 'profile', path: '/employee/profile', allow: ['HR_OFFICER', 'MAINTENANCE_OFFICER_INTERNAL', 'SUPER_ADMIN'] }
];
