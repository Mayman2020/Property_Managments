import type { AppNotification } from '../models/notification.model';
import type { AuthService } from '../services/auth.service';

type Role = ReturnType<AuthService['getRole']>;

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

function paramsRecord(n: AppNotification): Record<string, unknown> {
  return (n.params ?? {}) as Record<string, unknown>;
}

function varsRecord(n: AppNotification): Record<string, unknown> {
  const p = paramsRecord(n);
  return (p['vars'] ?? {}) as Record<string, unknown>;
}

function requestIdFromNotification(n: AppNotification): number | undefined {
  const p = paramsRecord(n);
  const vars = varsRecord(n);
  return num(n.requestId ?? p['requestId'] ?? vars['requestId']);
}

function idsFromPayload(n: AppNotification): {
  contractId?: number;
  maintenanceContractId?: number;
  invoiceId?: number;
  scheduleId?: number;
  unitId?: number;
  tenantId?: number;
  propertyId?: number;
  complaintId?: number;
  listingId?: number;
  inspectionId?: number;
  expenseId?: number;
} {
  const p = paramsRecord(n);
  const vars = varsRecord(n);
  const propertyFromRow = n.propertyId != null && n.propertyId > 0 ? n.propertyId : undefined;
  return {
    contractId: num(p['contractId'] ?? vars['contractId']),
    maintenanceContractId: num(p['maintenanceContractId'] ?? vars['maintenanceContractId']),
    invoiceId: num(p['invoiceId'] ?? vars['invoiceId']),
    scheduleId: num(p['scheduleId'] ?? vars['scheduleId']),
    unitId: num(p['unitId'] ?? vars['unitId']),
    tenantId: num(p['tenantId'] ?? vars['tenantId']),
    propertyId: num(p['propertyId'] ?? vars['propertyId']) ?? propertyFromRow,
    complaintId: num(p['complaintId'] ?? vars['complaintId']),
    listingId: num(p['listingId'] ?? vars['listingId']),
    inspectionId: num(p['inspectionId'] ?? vars['inspectionId']),
    expenseId: num(p['expenseId'] ?? vars['expenseId']),
  };
}

function isAdminStaff(role: Role): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'GENERAL_MANAGER' ||
    role === 'ACCOUNTANT' ||
    role === 'OWNER' ||
    role === 'PROCEDURES_CLERK' ||
    role === 'PROPERTY_GUARD' ||
    role === 'HR_OFFICER'
  );
}

function isMaintenanceOfficer(role: Role): boolean {
  return (
    role === 'MAINTENANCE_OFFICER_INTERNAL' ||
    role === 'MAINTENANCE_OFFICER_COMPANY' ||
    role === 'MAINTENANCE_COMPANY'
  );
}

function isEmployeePortalRole(role: Role): boolean {
  return role === 'PROCEDURES_CLERK' || role === 'PROPERTY_GUARD' || role === 'HR_OFFICER';
}

function maintenanceRequestUrl(role: Role, requestId: number): string {
  if (isMaintenanceOfficer(role)) return `/officer/requests/${requestId}`;
  if (role === 'TENANT') return `/tenant/requests/${requestId}`;
  return `/admin/maintenance/${requestId}`;
}

function contractDetailUrl(role: Role, contractId: number, scheduleId?: number): string | null {
  const scheduleQuery = scheduleId != null ? `?tab=schedule&scheduleId=${scheduleId}` : '';
  if (role === 'TENANT') return `/tenant/contracts/${contractId}${scheduleQuery}`;
  if (isAdminStaff(role)) return `/admin/contracts/${contractId}${scheduleQuery}`;
  return null;
}

function maintenanceContractUrl(role: Role, maintenanceContractId: number, invoiceId?: number): string | null {
  if (!isAdminStaff(role) && !isMaintenanceOfficer(role)) return null;
  const invoiceQuery = invoiceId != null ? `?invoiceId=${invoiceId}` : '';
  return `/admin/contracts/maintenance/${maintenanceContractId}${invoiceQuery}`;
}

function complaintTargetUrl(role: Role, complaintId: number): string | null {
  if (role === 'TENANT') return `/tenant/complaints?complaintId=${complaintId}`;
  if (isAdminStaff(role)) return `/admin/contracts/complaints?complaintId=${complaintId}`;
  return null;
}

function profileUrl(role: Role): string | null {
  if (isAdminStaff(role) || isEmployeePortalRole(role)) return '/admin/profile';
  if (isMaintenanceOfficer(role)) return '/officer/profile';
  if (role === 'TENANT') return '/tenant/profile';
  return null;
}

function payrollRunUrl(payrollId?: number): string {
  return payrollId != null ? `/admin/hr/payroll/${payrollId}` : '/admin/hr/payroll';
}

function resolvePayrollHrUrl(type: string, role: Role, reqId?: number): string | null {
  const payrollTypes = new Set([
    'PAYROLL_GENERATED',
    'PAYROLL_SUBMITTED',
    'PAYROLL_APPROVED',
    'PAYROLL_REJECTED',
    'PAYROLL_MARKED_PAID',
    'PAYROLL_HR_DEDUCTION_APPLIED',
  ]);
  if (payrollTypes.has(type) && isAdminStaff(role)) {
    return payrollRunUrl(reqId);
  }

  if (type === 'SALARY_ADVANCE_REQUESTED' && isAdminStaff(role)) {
    return '/admin/hr/payroll';
  }

  const employeeAdvanceTypes = new Set([
    'SALARY_ADVANCE_APPROVED',
    'SALARY_ADVANCE_REJECTED',
    'SALARY_ADVANCE_DEDUCTED',
  ]);
  if (employeeAdvanceTypes.has(type) && (isEmployeePortalRole(role) || role === 'ACCOUNTANT')) {
    return '/employee/my-payslips';
  }

  if (type === 'PAYSLIP_AVAILABLE' && reqId != null) {
    if (isEmployeePortalRole(role) || role === 'ACCOUNTANT') {
      return `/employee/my-payslips/${reqId}`;
    }
  }

  const deductionTypes = new Set([
    'HR_DEDUCTION_SENT_TO_ACCOUNTANT',
    'HR_DEDUCTION_APPROVED',
    'HR_DEDUCTION_REJECTED',
  ]);
  if (deductionTypes.has(type) && isAdminStaff(role)) {
    if (type === 'HR_DEDUCTION_SENT_TO_ACCOUNTANT') return '/admin/hr/payroll';
    return '/admin/hr/deductions';
  }

  const leaveTypes = new Set([
    'LEAVE_REQUEST_SUBMITTED',
    'LEAVE_REQUEST_APPROVED',
    'LEAVE_REQUEST_REJECTED',
    'LEAVE_BALANCE_LOW',
  ]);
  if (leaveTypes.has(type)) {
    if (type === 'LEAVE_BALANCE_LOW' && reqId != null && isAdminStaff(role)) {
      return `/admin/hr/employees/${reqId}`;
    }
    if (isAdminStaff(role)) return '/admin/hr/leaves';
  }

  return null;
}

const OWNER_APPROVAL_TYPES = new Set([
  'CONTRACT_AWAITING_OWNER_REVIEW',
  'CONTRACT_TERMINATION_REQUESTED',
  'CONTRACT_RENEWAL_REQUESTED',
  'MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW',
  'MAINTENANCE_CONTRACT_TERMINATION_REQUESTED',
  'MAINTENANCE_CONTRACT_RENEWAL_REQUESTED',
]);

const TENANT_CONTRACT_INBOX_TYPES = new Set([
  'CONTRACT_ACTIVATED',
  'CONTRACT_EXPIRING',
  'CONTRACT_EXPIRING_SOON',
  'TENANT_DRAFT_LEASE_PENDING_OWNER',
  'TENANT_LEASE_REJECTED_BY_OWNER',
  'TENANT_LEASE_AMENDED_BY_OWNER',
  'TENANT_LEASE_OWNER_APPROVAL_DENIED',
  'TENANT_CONTRACT_RENEWAL_REQUESTED',
  'TENANT_CONTRACT_TERMINATION_REQUESTED',
  'CONTRACT_RENEWAL_APPROVED',
  'CONTRACT_RENEWAL_REJECTED',
  'CONTRACT_TERMINATION_APPROVED',
  'CONTRACT_TERMINATION_REJECTED',
  'NO_RENEWAL_INTENT_SUBMITTED',
  'DEPOSIT_RETURNED',
  'UNIT_DAMAGE_REPORTED',
  'DAMAGE_RECEIPT_SUBMITTED',
  'DAMAGE_PAYMENT_CONFIRMED',
  'UNIT_CLEARED',
]);

const MAINTENANCE_CONTRACT_FOLLOWUP_TYPES = new Set([
  'MAINTENANCE_CONTRACT_APPROVED',
  'MAINTENANCE_CONTRACT_REJECTED',
  'MAINTENANCE_CONTRACT_TERMINATION_APPROVED',
  'MAINTENANCE_CONTRACT_TERMINATION_REJECTED',
  'MAINTENANCE_CONTRACT_RENEWAL_APPROVED',
  'MAINTENANCE_CONTRACT_RENEWAL_REJECTED',
  'MAINTENANCE_CONTRACT_INVOICE_ISSUED',
  'MAINTENANCE_CONTRACT_PAYMENT_SCHEDULED',
  'MAINTENANCE_CONTRACT_PAYMENT_DUE_SOON',
  'MAINTENANCE_CONTRACT_PAYMENT_DUE_TODAY',
  'MAINTENANCE_CONTRACT_PAYMENT_RECEIVED',
]);

/**
 * In-app route for this notification, or `null` to stay on the notifications inbox.
 */
export function resolveNotificationTargetUrl(n: AppNotification, auth: AuthService): string | null {
  const role = auth.getRole();
  const type = n.type;
  const p = paramsRecord(n);
  const reqId = requestIdFromNotification(n);
  const ids = idsFromPayload(n);

  const explicitRoute = typeof p['route'] === 'string' ? p['route'].trim() : '';
  if (explicitRoute.startsWith('/')) {
    return explicitRoute;
  }

  const payrollHrUrl = resolvePayrollHrUrl(type, role, reqId);
  if (payrollHrUrl) return payrollHrUrl;

  if (
    reqId != null &&
    (type.startsWith('REQUEST_') || type === 'MAINTENANCE_UPDATE' || type === 'MAINTENANCE_REQUEST_OVERDUE')
  ) {
    return maintenanceRequestUrl(role, reqId);
  }

  const complaintId = ids.complaintId ?? (type.startsWith('COMPLAINT_') ? reqId : undefined);
  if (complaintId != null) {
    const complaintUrl = complaintTargetUrl(role, complaintId);
    if (complaintUrl) return complaintUrl;
  }
  if (type.startsWith('COMPLAINT_')) {
    if (role === 'TENANT') return '/tenant/complaints';
    if (isAdminStaff(role)) return '/admin/contracts/complaints';
  }

  if (ids.inspectionId != null) {
    if (isAdminStaff(role)) return `/admin/inspections/${ids.inspectionId}`;
    if (role === 'TENANT') return `/tenant/my-contracts`;
  }
  if (type === 'INSPECTION_SCHEDULED' && role === 'TENANT') {
    return ids.contractId != null ? contractDetailUrl(role, ids.contractId) : '/tenant/my-contracts';
  }

  if (ids.listingId != null && (type === 'RENTAL_INQUIRY_RECEIVED' || type === 'VACANCY_PUBLISHED')) {
    if (isAdminStaff(role)) return `/admin/vacancies/${ids.listingId}/inquiries`;
  }

  if (ids.maintenanceContractId != null) {
    const url = maintenanceContractUrl(role, ids.maintenanceContractId, ids.invoiceId);
    if (url) return url;
  }

  if (MAINTENANCE_CONTRACT_FOLLOWUP_TYPES.has(type) && isAdminStaff(role)) {
    return '/admin/contracts/list?type=MAINTENANCE';
  }

  if (OWNER_APPROVAL_TYPES.has(type)) {
    if (ids.maintenanceContractId != null) {
      const url = maintenanceContractUrl(role, ids.maintenanceContractId);
      if (url) return url;
    }
    if (isAdminStaff(role)) return '/admin/owner-portal/contract-approvals';
  }

  if (ids.contractId != null) {
    const url = contractDetailUrl(role, ids.contractId, ids.scheduleId);
    if (url) return url;
  }

  if (role === 'TENANT' && TENANT_CONTRACT_INBOX_TYPES.has(type)) {
    return ids.contractId != null ? contractDetailUrl(role, ids.contractId) : '/tenant/my-contracts';
  }

  if (
    (type === 'RENT_DUE' || type === 'RENT_OVERDUE' || type === 'RENT_GRACE_PERIOD_ENDING') &&
    role === 'TENANT'
  ) {
    return ids.contractId != null
      ? contractDetailUrl(role, ids.contractId, ids.scheduleId)
      : '/tenant/my-contracts';
  }

  if (type === 'UNIT_ADDED_TO_OWNER_PROPERTY' && isAdminStaff(role)) {
    return ids.propertyId != null ? `/admin/units?propertyId=${ids.propertyId}` : '/admin/units';
  }

  if (type === 'TENANT_REGISTERED_ON_OWNER_PROPERTY' && isAdminStaff(role)) {
    return ids.propertyId != null ? `/admin/tenants?propertyId=${ids.propertyId}` : '/admin/tenants';
  }

  if (type === 'PROPERTY_LINKED_TO_OWNER' && role === 'OWNER') {
    return '/admin/properties';
  }

  if (type === 'OWNER_STATEMENT' && role === 'OWNER') {
    return '/admin/owner-portal/statements';
  }

  if (
    type === 'PAYMENT_RECEIVED' &&
    (role === 'ACCOUNTANT' || role === 'SUPER_ADMIN' || role === 'GENERAL_MANAGER')
  ) {
    return '/admin/accountant-portal/rent-confirmation';
  }

  if (
    (type === 'BUDGET_THRESHOLD_EXCEEDED' || type === 'FINANCE_ALERT') &&
    (role === 'SUPER_ADMIN' || role === 'GENERAL_MANAGER' || role === 'ACCOUNTANT')
  ) {
    return '/admin/finance/expenses';
  }

  if (
    type === 'VACANCY_PUBLISHED' &&
    isAdminStaff(role)
  ) {
    return ids.listingId != null ? `/admin/vacancies/${ids.listingId}/inquiries` : '/admin/units';
  }

  if (type === 'INVENTORY_LOW_STOCK' && isAdminStaff(role)) {
    return '/admin/inventory';
  }

  if (type === 'DOCUMENT_EXPIRY_WARNING' && isAdminStaff(role)) {
    return ids.propertyId != null ? `/admin/properties?propertyId=${ids.propertyId}` : '/admin/properties';
  }

  if (
    (type === 'MAINTENANCE_PROVIDER_ASSIGNED' || type === 'MAINTENANCE_PROVIDER_UNASSIGNED') &&
    (isAdminStaff(role) || isMaintenanceOfficer(role))
  ) {
    return ids.propertyId != null ? `/admin/maintenance?propertyId=${ids.propertyId}` : '/admin/maintenance';
  }

  if (type === 'NEW_LOGIN_ALERT' || type === 'ACCOUNT_LOCKED') {
    return profileUrl(role);
  }

  if (type === 'ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED' || type.startsWith('ACCOUNTANT_CONTRACT_RENEWAL_')) {
    if (ids.contractId != null && isAdminStaff(role)) {
      return contractDetailUrl(role, ids.contractId);
    }
    if (isAdminStaff(role)) return '/admin/contracts/list';
  }

  return null;
}

/** Full notifications inbox route for the signed-in role. */
export function notificationsInboxRoute(auth: AuthService): string {
  const role = auth.getRole();
  if (isEmployeePortalRole(role)) {
    return '/employee/notifications';
  }
  if (
    role === 'SUPER_ADMIN' ||
    role === 'GENERAL_MANAGER' ||
    role === 'ACCOUNTANT' ||
    role === 'OWNER' ||
    role === 'PROPERTY_GUARD' ||
    role === 'PROCEDURES_CLERK' ||
    role === 'HR_OFFICER'
  ) {
    return '/admin/notifications';
  }
  if (role === 'TENANT') {
    return '/tenant/notifications';
  }
  if (isMaintenanceOfficer(role)) {
    return '/officer/notifications';
  }
  return auth.getDashboardRoute();
}
