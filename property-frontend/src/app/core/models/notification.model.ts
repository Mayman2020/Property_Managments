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
  | 'PAYMENT_RECEIVED'
  | 'PAYROLL_GENERATED'
  | 'FINANCE_ALERT'
  | 'MAINTENANCE_UPDATE'
  | 'OWNER_STATEMENT'
  | 'GENERAL';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  propertyId?: number;
  requestId?: number;
  read: boolean;
  readAt?: string;
  createdAt: string;
}
