export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_ASSIGNED'
  | 'REQUEST_SCHEDULED'
  | 'REQUEST_VISIT_REPORTED'
  | 'REQUEST_CANCELLED';

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
