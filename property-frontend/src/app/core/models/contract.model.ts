export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_OWNER_APPROVAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'RENEWED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'PENDING_TERMINATION_APPROVAL'
  | 'PENDING_RENEWAL_APPROVAL';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type PaymentScheduleStatus = 'PENDING' | 'PENDING_CONFIRMATION' | 'PAYMENT_REJECTED' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'WAIVED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'ONLINE' | 'OTHER';
export type ComplaintPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type TemplateType = 'RESIDENTIAL' | 'COMMERCIAL' | 'SHOP';

export interface LeaseContract {
  id: number;
  contractNumber: string;
  tenantId: number;
  tenantName?: string;
  unitId: number;
  unitNumber?: string;
  propertyId: number;
  propertyName?: string;
  propertyCoverImageUrl?: string;
  ownerId?: number;
  ownerName?: string;
  templateId?: number;
  startDate: string;
  endDate: string;
  signingDate?: string;
  monthlyRent: number;
  annualRent?: number;
  securityDeposit?: number;
  paymentFrequency: PaymentFrequency;
  paymentDay: number;
  currency: string;
  status: ContractStatus;
  autoRenewable: boolean;
  renewalNoticeDays?: number;
  contractPdfUrl?: string;
  signedPdfUrl?: string;
  terminationDate?: string;
  terminationReason?: string;
  /** محضر إلغاء — هل يُرجع التأمين */
  terminationDepositReturn?: boolean | null;
  terminationHasDamages?: boolean | null;
  terminationDamagesAmount?: number | null;
  terminationDamagesTenantPaid?: boolean | null;
  terminationDamagesReceiptUrl?: string | null;
  terminationDamageNotes?: string | null;
  terminatedBy?: number | null;
  terminatedByName?: string | null;
  noRenewalIntentAt?: string | null;
  noRenewalIntentBy?: number | null;
  noRenewalIntentByName?: string | null;
  depositIncomeRecorded?: boolean | null;
  depositExpenseRecorded?: boolean | null;
  /** Staff user who submitted the termination request (when status = PENDING_TERMINATION_APPROVAL). */
  terminationRequestedBy?: number | null;
  terminationRequestedByName?: string | null;
  terminationRequestedAt?: string | null;
  terminationRequestNotes?: string | null;
  /** Owner / admin who decided on the termination request (filled on approve/reject). */
  terminationDecisionBy?: number | null;
  terminationDecisionByName?: string | null;
  terminationDecisionAt?: string | null;
  terminationDecisionNotes?: string | null;
  renewalRequestedBy?: number | null;
  renewalRequestedByName?: string | null;
  renewalRequestedAt?: string | null;
  renewalRequestedNote?: string | null;
  renewalProposedStartDate?: string | null;
  renewalProposedEndDate?: string | null;
  renewalProposedRentAmount?: number | null;
  renewalDecisionBy?: number | null;
  renewalDecisionByName?: string | null;
  renewalDecisionAt?: string | null;
  renewalDecisionNote?: string | null;
  renewalDecisionStatus?: 'APPROVED' | 'REJECTED' | null;
  notes?: string;
  freeMonths?: number;
  hasFreeMonth?: boolean;
  rentDiscountReason?: string;
  otherReasonText?: string;
  furnishedStatus?: string;
  ownerApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  ownerApprovalNotes?: string;
  /** Owner edits on draft before activation (human-readable log). */
  ownerChangeLog?: string;
  /** Staff audit log (timestamp | user | action | detail). */
  staffChangeLog?: string;
  escalationType?: string;
  escalationRate?: number;
  daysUntilExpiry: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  createdByName?: string;
  approvedBy?: number;
  approvedByName?: string;
  modifiedBy?: number;
  modifiedByName?: string;
}

export interface ContractSummary {
  id: number;
  contractNumber: string;
  tenantId?: number;
  tenantName?: string;
  unitId?: number;
  unitNumber?: string;
  propertyName?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  currency: string;
  status: ContractStatus;
  daysUntilExpiry: number;
  ownerApprovalStatus?: string | null;
}

export interface RentPaymentSchedule {
  id: number;
  contractId: number;
  contractNumber?: string;
  tenantId?: number;
  tenantName?: string;
  dueDate: string;
  amount: number;
  periodFrom: string;
  periodTo: string;
  status: PaymentScheduleStatus;
  daysOverdue: number;
  createdAt: string;
  /** Latest recorded payment for this schedule row (receipt / audit). */
  receiptUrl?: string;
  settlementNotes?: string;
  settlementPaymentDate?: string;
  recordedByName?: string;
  proofUrl?: string;
  proofNotes?: string;
  proofPaymentMethod?: PaymentMethod | string;
  proofReferenceNumber?: string;
  proofSubmittedBy?: number;
  proofSubmittedByName?: string;
  proofSubmittedAt?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  proofUrls?: string[];
  proofPaymentDate?: string;
  propertyId?: number;
  propertyNameAr?: string;
  propertyNameEn?: string;
}

export interface RentPayment {
  id: number;
  scheduleId?: number;
  contractId: number;
  contractNumber?: string;
  tenantId?: number;
  tenantName?: string;
  paymentDate: string;
  amountPaid: number;
  amountDue: number;
  balance: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  receiptUrl?: string;
  lateFee?: number;
  discount?: number;
  notes?: string;
  createdAt: string;
}

export interface ContractFee {
  id: number;
  contractId: number;
  feeType?: string;
  description?: string;
  amount: number;
  dueDate?: string;
  paid: boolean;
  paidDate?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface TenantComplaint {
  id: number;
  tenantId?: number;
  tenantName?: string;
  unitId?: number;
  propertyId?: number;
  propertyName?: string;
  complaintType?: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: number;
  resolution?: string;
  attachmentUrl?: string;
  maintenanceRequestId?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface ContractTemplate {
  id: number;
  templateName: string;
  templateNameAr?: string;
  templateNameEn?: string;
  templateType?: TemplateType;
  content: string;
  variables?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractsDashboardStats {
  activeContracts: number;
  expiringIn30Days: number;
  totalMonthlyRent?: number;
  overduePayments: number;
  overdueAmount?: number;
  occupancyRate?: number;
  vacantUnits?: number;
  openComplaints: number;
}

export interface CreateContractRequest {
  tenantId: number;
  unitId: number;
  propertyId: number;
  ownerId?: number;
  templateId?: number;
  startDate: string;
  endDate: string;
  signingDate?: string;
  monthlyRent: number;
  securityDeposit?: number;
  paymentFrequency?: PaymentFrequency;
  paymentDay?: number;
  currency?: string;
  autoRenewable?: boolean;
  renewalNoticeDays?: number;
  notes?: string;
  hasFreeMonth?: boolean;
  rentDiscountReason?: string;
  otherReasonText?: string;
  /** Staff draft edit audit (admin dialog). */
  staffModificationReason?: string;
  employeeDiscountPercent?: number;
  linkedEmployeeId?: number;
  escalationType?: string;
  escalationRate?: number | null;
}

export interface RecordPaymentRequest {
  contractId: number;
  scheduleId?: number;
  tenantId?: number;
  paymentDate: string;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string;
  referenceNumber?: string;
  receiptUrl?: string;
  lateFee?: number;
  discount?: number;
  notes?: string;
}

export interface RenewContractRequest {
  newStartDate: string;
  newEndDate: string;
  newMonthlyRent: number;
  notes?: string;
  /** 0–12, optional; defaults 0 on backend */
  freeMonths?: number;
}

export interface ContractRenewalRequest {
  proposedStartDate: string;
  proposedEndDate: string;
  proposedRentAmount: number;
  note?: string;
}

export interface RenewalChainContract {
  id: number;
  contractNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  freeMonths?: number;
  hasFreeMonth?: boolean;
}

export interface MaintenanceRenewalSnippet {
  id: number;
  requestNumber: string;
  title: string;
  status: string;
  scheduledDate?: string | null;
}

/** GET /contracts/:id/renewal-context */
export interface ContractRenewalContext {
  contract: LeaseContract;
  unit: UnitRenewalSnapshot | null;
  rootContractStartDate: string;
  currentContractEndDate: string;
  priorRenewalCount: number;
  renewalChain: RenewalChainContract[];
  currentContractFreeMonths?: number | null;
  currentContractHasFreeMonth?: boolean | null;
  openMaintenanceRequestCount: number;
  scheduledOrActiveMaintenanceCount: number;
  openMaintenanceSamples: MaintenanceRenewalSnippet[];
}

/** Mirrors backend UnitResponse for renewal screen */
export interface UnitRenewalSnapshot {
  id: number;
  propertyId: number;
  floorId?: number | null;
  floorNumber?: number | null;
  unitNumber: string;
  unitType?: string;
  furnishedStatus?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  rented: boolean;
  rentAmount?: number | null;
  currency?: string;
  notes?: string | null;
  active: boolean;
}

export interface TerminateContractRequest {
  terminationDate: string;
  terminationReason: string;
  securityDepositReturnToTenant: boolean;
  hasDamages: boolean;
  damagesAmount?: number | null;
  damagesPaidByTenant: boolean;
}
