export type ContractStatus = 'DRAFT' | 'PENDING_OWNER_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED' | 'SUSPENDED';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type PaymentScheduleStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'WAIVED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'ONLINE' | 'OTHER';
export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ViolationStatus = 'OPEN' | 'NOTIFIED' | 'RESOLVED' | 'ESCALATED';
export type ComplaintPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type InspectionType = 'MOVE_IN' | 'MOVE_OUT' | 'PERIODIC';
export type OverallCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
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
  notes?: string;
  freeMonths?: number;
  ownerApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  ownerApprovalNotes?: string;
  daysUntilExpiry: number;
  createdAt: string;
  updatedAt: string;
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
}

export interface RentPaymentSchedule {
  id: number;
  contractId: number;
  dueDate: string;
  amount: number;
  periodFrom: string;
  periodTo: string;
  status: PaymentScheduleStatus;
  daysOverdue: number;
  createdAt: string;
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

export interface TenantViolation {
  id: number;
  contractId?: number;
  tenantId: number;
  tenantName?: string;
  unitId?: number;
  unitNumber?: string;
  violationType?: string;
  description: string;
  severity?: ViolationSeverity;
  status: ViolationStatus;
  fineAmount: number;
  finePaid: boolean;
  evidenceUrl?: string;
  notes?: string;
  reportedBy?: number;
  resolvedAt?: string;
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
  createdAt: string;
  resolvedAt?: string;
}

export interface UnitInspection {
  id: number;
  unitId: number;
  contractId?: number;
  inspectionType?: InspectionType;
  inspectionDate: string;
  wallsCondition?: number;
  floorsCondition?: number;
  doorsCondition?: number;
  windowsCondition?: number;
  plumbingCondition?: number;
  electricalCondition?: number;
  acCondition?: number;
  overallCondition?: OverallCondition;
  notes?: string;
  damagesDescription?: string;
  deductionsAmount?: number;
  tenantConfirmed: boolean;
  officerId?: number;
  createdAt: string;
}

export interface ContractTemplate {
  id: number;
  templateName: string;
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
  openViolations: number;
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
}

export interface TerminateContractRequest {
  terminationDate: string;
  terminationReason?: string;
}
