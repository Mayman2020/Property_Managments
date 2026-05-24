import type { AppNotification } from '../models/notification.model';
import type { AuthService } from '../services/auth.service';

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

function idsFromPayload(n: AppNotification): {
  contractId?: number;
  maintenanceContractId?: number;
  invoiceId?: number;
  scheduleId?: number;
  unitId?: number;
  tenantId?: number;
  propertyId?: number;
} {
  const p = (n.params ?? {}) as Record<string, unknown>;
  const vars = (p['vars'] ?? {}) as Record<string, unknown>;
  const propertyFromRow = n.propertyId != null && n.propertyId > 0 ? n.propertyId : undefined;
  return {
    contractId: num(p['contractId'] ?? vars['contractId']),
    maintenanceContractId: num(p['maintenanceContractId'] ?? vars['maintenanceContractId']),
    invoiceId: num(p['invoiceId'] ?? vars['invoiceId']),
    scheduleId: num(p['scheduleId'] ?? vars['scheduleId']),
    unitId: num(p['unitId'] ?? vars['unitId']),
    tenantId: num(p['tenantId'] ?? vars['tenantId']),
    propertyId: num(p['propertyId'] ?? vars['propertyId']) ?? propertyFromRow,
  };
}

/**
 * In-app route for this notification, or `null` to stay where you are (e.g. notifications inbox row).
 */
export function resolveNotificationTargetUrl(n: AppNotification, auth: AuthService): string | null {
  const role = auth.getRole();

  if (
    (n.type === 'CONTRACT_AWAITING_OWNER_REVIEW'
      || n.type === 'CONTRACT_TERMINATION_REQUESTED'
      || n.type === 'CONTRACT_RENEWAL_REQUESTED'
      || n.type === 'MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW'
      || n.type === 'MAINTENANCE_CONTRACT_TERMINATION_REQUESTED'
      || n.type === 'MAINTENANCE_CONTRACT_RENEWAL_REQUESTED') &&
    (role === 'OWNER' ||
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT')
  ) {
    return '/admin/owner-portal/contract-approvals';
  }

  const listingId = num(n.params?.listingId);
  if (n.type === 'RENTAL_INQUIRY_RECEIVED' && listingId != null) {
    return `/admin/vacancies/${listingId}/inquiries`;
  }

  const inspectionId = num(n.params?.inspectionId);
  if (n.type === 'INSPECTION_COMPLETED' && inspectionId != null) {
    return `/admin/inspections/${inspectionId}`;
  }

  const reqId = n.requestId != null && n.requestId > 0 ? n.requestId : undefined;
  if (reqId != null && n.type.startsWith('REQUEST_')) {
    if (
      role === 'MAINTENANCE_OFFICER_INTERNAL' ||
      role === 'MAINTENANCE_OFFICER_COMPANY' ||
      role === 'MAINTENANCE_COMPANY'
    ) {
      return `/officer/requests/${reqId}`;
    }
    if (role === 'TENANT') {
      return `/tenant/requests/${reqId}`;
    }
    return `/admin/maintenance/${reqId}`;
  }

  const { contractId, maintenanceContractId, invoiceId, scheduleId, propertyId } = idsFromPayload(n);

  if (maintenanceContractId != null) {
    if (
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER' ||
      role === 'PROCEDURES_CLERK' ||
      role === 'MAINTENANCE_OFFICER_INTERNAL' ||
      role === 'MAINTENANCE_OFFICER_COMPANY' ||
      role === 'MAINTENANCE_COMPANY'
    ) {
      const invoiceQuery = invoiceId != null ? `?invoiceId=${invoiceId}` : '';
      return `/admin/contracts/maintenance/${maintenanceContractId}${invoiceQuery}`;
    }
    return null;
  }

  if (contractId != null) {
    const scheduleQuery = scheduleId != null ? `?tab=schedule&scheduleId=${scheduleId}` : '';
    if (role === 'TENANT') {
      return `/tenant/contracts/${contractId}${scheduleQuery}`;
    }
    if (
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER' ||
      role === 'PROCEDURES_CLERK' ||
      role === 'PROPERTY_GUARD'
    ) {
      return `/admin/contracts/${contractId}${scheduleQuery}`;
    }
    return null;
  }

  if (
    role === 'TENANT' &&
    [
      'CONTRACT_ACTIVATED',
      'CONTRACT_EXPIRING',
      'TENANT_DRAFT_LEASE_PENDING_OWNER',
      'TENANT_LEASE_REJECTED_BY_OWNER',
      'TENANT_LEASE_AMENDED_BY_OWNER',
      'TENANT_LEASE_OWNER_APPROVAL_DENIED',
      'TENANT_CONTRACT_RENEWAL_REQUESTED',
      'CONTRACT_RENEWAL_APPROVED',
      'CONTRACT_RENEWAL_REJECTED'
    ].includes(n.type)
  ) {
    return '/tenant/my-contracts';
  }

  const maintenanceContractFollowUpTypes = [
    'MAINTENANCE_CONTRACT_APPROVED',
    'MAINTENANCE_CONTRACT_REJECTED',
    'MAINTENANCE_CONTRACT_TERMINATION_APPROVED',
    'MAINTENANCE_CONTRACT_TERMINATION_REJECTED',
    'MAINTENANCE_CONTRACT_RENEWAL_APPROVED',
    'MAINTENANCE_CONTRACT_RENEWAL_REJECTED'
  ];
  if (
    maintenanceContractFollowUpTypes.includes(n.type) &&
    (role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER' ||
      role === 'PROCEDURES_CLERK')
  ) {
    return '/admin/contracts/list?type=MAINTENANCE';
  }

  if (n.type === 'UNIT_ADDED_TO_OWNER_PROPERTY') {
    if (
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER'
    ) {
      return propertyId != null ? `/admin/units?propertyId=${propertyId}` : '/admin/units';
    }
    return null;
  }

  if (n.type === 'TENANT_REGISTERED_ON_OWNER_PROPERTY') {
    if (
      role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER'
    ) {
      return propertyId != null ? `/admin/tenants?propertyId=${propertyId}` : '/admin/tenants';
    }
    return null;
  }

  if (n.type === 'PROPERTY_LINKED_TO_OWNER' && role === 'OWNER') {
    return '/admin/properties';
  }

  if (n.type === 'OWNER_STATEMENT' && role === 'OWNER') {
    return '/admin/owner-portal/statements';
  }

  if (
    n.type === 'PAYMENT_RECEIVED' &&
    (role === 'ACCOUNTANT' || role === 'SUPER_ADMIN' || role === 'GENERAL_MANAGER')
  ) {
    return '/admin/accountant-portal/rent-confirmation';
  }

  if (
    (n.type === 'BUDGET_THRESHOLD_EXCEEDED' || n.type === 'FINANCE_ALERT') &&
    (role === 'SUPER_ADMIN' || role === 'GENERAL_MANAGER' || role === 'ACCOUNTANT')
  ) {
    return '/admin/finance/expenses';
  }

  if (
    n.type === 'VACANCY_PUBLISHED' &&
    (role === 'SUPER_ADMIN' ||
      role === 'GENERAL_MANAGER' ||
      role === 'ACCOUNTANT' ||
      role === 'OWNER' ||
      role === 'PROCEDURES_CLERK')
  ) {
    const listingId = num(n.params?.listingId);
    return listingId != null ? `/admin/vacancies/${listingId}/inquiries` : '/admin/vacancies/list';
  }

  return null;
}
