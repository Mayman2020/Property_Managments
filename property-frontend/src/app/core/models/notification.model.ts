export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_ASSIGNED'
  | 'REQUEST_SCHEDULED'
  | 'REQUEST_SCHEDULE_ACCEPTED'
  | 'REQUEST_SCHEDULE_REJECTED'
  | 'REQUEST_VISIT_REPORTED'
  | 'REQUEST_COMPLETED'
  | 'REQUEST_RATED'
  | 'REQUEST_CANCELLED'
  | 'RENT_DUE'
  | 'RENT_OVERDUE'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_ACTIVATED'
  | 'CONTRACT_AWAITING_OWNER_REVIEW'
  | 'TENANT_DRAFT_LEASE_PENDING_OWNER'
  | 'TENANT_LEASE_REJECTED_BY_OWNER'
  | 'TENANT_LEASE_AMENDED_BY_OWNER'
  | 'TENANT_LEASE_OWNER_APPROVAL_DENIED'
  | 'ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED'
  | 'CONTRACT_TERMINATION_REQUESTED'
  | 'TENANT_CONTRACT_TERMINATION_REQUESTED'
  | 'CONTRACT_TERMINATION_APPROVED'
  | 'CONTRACT_TERMINATION_REJECTED'
  | 'CONTRACT_RENEWAL_REQUESTED'
  | 'TENANT_CONTRACT_RENEWAL_REQUESTED'
  | 'CONTRACT_RENEWAL_APPROVED'
  | 'CONTRACT_RENEWAL_REJECTED'
  | 'ACCOUNTANT_CONTRACT_RENEWAL_APPROVED'
  | 'ACCOUNTANT_CONTRACT_RENEWAL_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'PAYROLL_GENERATED'
  | 'FINANCE_ALERT'
  | 'MAINTENANCE_UPDATE'
  | 'MAINTENANCE_PROVIDER_ASSIGNED'
  | 'MAINTENANCE_PROVIDER_UNASSIGNED'
  | 'OWNER_STATEMENT'
  | 'PROPERTY_LINKED_TO_OWNER'
  | 'UNIT_ADDED_TO_OWNER_PROPERTY'
  | 'TENANT_REGISTERED_ON_OWNER_PROPERTY'
  | 'GENERAL'
  | 'MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW'
  | 'MAINTENANCE_CONTRACT_APPROVED'
  | 'MAINTENANCE_CONTRACT_REJECTED'
  | 'MAINTENANCE_CONTRACT_TERMINATION_REQUESTED'
  | 'MAINTENANCE_CONTRACT_TERMINATION_APPROVED'
  | 'MAINTENANCE_CONTRACT_TERMINATION_REJECTED'
  | 'MAINTENANCE_CONTRACT_RENEWAL_REQUESTED'
  | 'MAINTENANCE_CONTRACT_RENEWAL_APPROVED'
  | 'MAINTENANCE_CONTRACT_RENEWAL_REJECTED';

/**
 * Structured i18n payload sent by the backend so the frontend renders the
 * localized title/body from translation files instead of trusting raw strings.
 * Shape: { titleKey?, bodyKey?, vars? }.
 */
export interface NotificationParams {
  titleKey?: string;
  bodyKey?: string;
  vars?: Record<string, string | number | boolean | null>;
  /** Inbox deep-link hints (persisted beside i18n keys). */
  contractId?: number;
  maintenanceContractId?: number;
  unitId?: number;
  tenantId?: number;
  propertyId?: number;
  /** Complaint-originated maintenance request flags. */
  fromComplaint?: boolean;
  complaintId?: number;
  color?: string;
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  actorUserId?: number;
  actorDisplayName?: string;
  propertyId?: number;
  requestId?: number;
  read: boolean;
  readAt?: string;
  createdAt: string;
  /** Present when the notification was created via the localized flow. */
  params?: NotificationParams | null;
}
