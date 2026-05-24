package com.propertymanagement.modules.notification.entity;

public enum NotificationType {
    REQUEST_CREATED,
    REQUEST_ASSIGNED,
    REQUEST_SCHEDULED,
    REQUEST_SCHEDULE_ACCEPTED,
    REQUEST_SCHEDULE_REJECTED,
    REQUEST_VISIT_REPORTED,
    /** A maintenance provider (internal officer or contractor company) was linked to a property. */
    MAINTENANCE_PROVIDER_ASSIGNED,
    /** A maintenance provider assignment was ended for a property. */
    MAINTENANCE_PROVIDER_UNASSIGNED,
    MAINTENANCE_CONTRACT_AWAITING_OWNER_REVIEW,
    MAINTENANCE_CONTRACT_APPROVED,
    MAINTENANCE_CONTRACT_REJECTED,
    MAINTENANCE_CONTRACT_TERMINATION_REQUESTED,
    MAINTENANCE_CONTRACT_TERMINATION_APPROVED,
    MAINTENANCE_CONTRACT_TERMINATION_REJECTED,
    MAINTENANCE_CONTRACT_RENEWAL_REQUESTED,
    MAINTENANCE_CONTRACT_RENEWAL_APPROVED,
    MAINTENANCE_CONTRACT_RENEWAL_REJECTED,
    MAINTENANCE_CONTRACT_INVOICE_ISSUED,
    MAINTENANCE_CONTRACT_PAYMENT_SCHEDULED,
    MAINTENANCE_CONTRACT_PAYMENT_DUE_SOON,
    MAINTENANCE_CONTRACT_PAYMENT_DUE_TODAY,
    MAINTENANCE_CONTRACT_PAYMENT_RECEIVED,
    REQUEST_COMPLETED,
    REQUEST_RATED,
    REQUEST_CANCELLED,
    RENT_DUE,
    RENT_OVERDUE,
    CONTRACT_EXPIRING,
    CONTRACT_ACTIVATED,
    /** New DRAFT lease created on a property — owner(s) should review/approve. */
    CONTRACT_AWAITING_OWNER_REVIEW,
    /** Tenant: draft lease exists; unit reserved until owner approves / staff activates. */
    TENANT_DRAFT_LEASE_PENDING_OWNER,
    /** Owner portal: draft lease rejected — contract cancelled; reason in message. */
    TENANT_LEASE_REJECTED_BY_OWNER,
    /** Owner portal: draft amended (unit/rent) — details and reason in message. */
    TENANT_LEASE_AMENDED_BY_OWNER,
    /** Owner declined to activate a PENDING_OWNER_APPROVAL contract; stays DRAFT with notes. */
    TENANT_LEASE_OWNER_APPROVAL_DENIED,
    /** Same draft-rejection event as above, fanned out to property + global accountants. */
    ACCOUNTANT_LEASE_OWNER_APPROVAL_DENIED,
    /** Staff submitted a termination request — owner inbox: review and approve / reject. */
    CONTRACT_TERMINATION_REQUESTED,
    /** Tenant inbox copy of the same request (informational). */
    TENANT_CONTRACT_TERMINATION_REQUESTED,
    /** Owner approved the termination request — accountants + tenant get the final handover info. */
    CONTRACT_TERMINATION_APPROVED,
    /** Owner rejected the termination request — contract stays ACTIVE; accountants + tenant notified. */
    CONTRACT_TERMINATION_REJECTED,
    /** Staff submitted a renewal request — owner inbox: review proposed dates/rent. */
    CONTRACT_RENEWAL_REQUESTED,
    /** Tenant sees that renewal is requested and pending owner approval. */
    TENANT_CONTRACT_RENEWAL_REQUESTED,
    /** Owner approved renewal request (shared semantic type; audience-specific body keys). */
    CONTRACT_RENEWAL_APPROVED,
    /** Owner rejected renewal request (shared semantic type; audience-specific body keys). */
    CONTRACT_RENEWAL_REJECTED,
    /** Accountant-facing approval notification variant for renewal decision. */
    ACCOUNTANT_CONTRACT_RENEWAL_APPROVED,
    /** Accountant-facing rejection notification variant for renewal decision. */
    ACCOUNTANT_CONTRACT_RENEWAL_REJECTED,
    PAYMENT_RECEIVED,
    PAYROLL_GENERATED,
    PAYROLL_SUBMITTED,
    PAYROLL_APPROVED,
    PAYROLL_REJECTED,
    PAYROLL_MARKED_PAID,
    /** Sent to the linked employee user when their pay slip is ready to view. */
    PAYSLIP_AVAILABLE,
    /** Salary advance request submitted — notifies HR/accountant. */
    SALARY_ADVANCE_REQUESTED,
    /** Salary advance approved — notifies employee. */
    SALARY_ADVANCE_APPROVED,
    /** Salary advance rejected — notifies employee. */
    SALARY_ADVANCE_REJECTED,
    /** Advance amount deducted from payslip — notifies employee. */
    SALARY_ADVANCE_DEDUCTED,
    HR_DEDUCTION_SENT_TO_ACCOUNTANT,
    HR_DEDUCTION_APPROVED,
    HR_DEDUCTION_REJECTED,
    PAYROLL_HR_DEDUCTION_APPLIED,
    LEAVE_REQUEST_SUBMITTED,
    LEAVE_REQUEST_APPROVED,
    LEAVE_REQUEST_REJECTED,
    /** Employee's annual leave balance is running low (below threshold). */
    LEAVE_BALANCE_LOW,
    FINANCE_ALERT,
    MAINTENANCE_UPDATE,
    /** Maintenance request has exceeded its expected completion date. */
    MAINTENANCE_REQUEST_OVERDUE,
    /** Inventory item quantity fell at or below its minimum threshold. */
    INVENTORY_LOW_STOCK,
    /** Total expenses for a budget category exceeded the allocated budget. */
    BUDGET_THRESHOLD_EXCEEDED,
    OWNER_STATEMENT,
    /** New login detected from an unfamiliar IP or device. */
    NEW_LOGIN_ALERT,
    /** Account locked after too many failed login attempts. */
    ACCOUNT_LOCKED,
    /** A property document, license, or attachment is expiring soon. */
    DOCUMENT_EXPIRY_WARNING,
    /** Tenant rent is in grace period — final reminder before overdue. */
    RENT_GRACE_PERIOD_ENDING,
    /** Owner portal user linked to a property via registration / property owners list. */
    PROPERTY_LINKED_TO_OWNER,
    /** A new unit was registered under a property linked to the owner portal account. */
    UNIT_ADDED_TO_OWNER_PROPERTY,
    /** Tenant profile assigned to a unit on an owner-linked property (staff tenant registration). */
    TENANT_REGISTERED_ON_OWNER_PROPERTY,
    GENERAL,
    COMPLAINT_SUBMITTED,
    COMPLAINT_REPLY_RECEIVED,
    COMPLAINT_CLOSED,
    COMPLAINT_RATED,
    /** Contract expiring in 3 days — sent to tenant, owner, accountants before end date. */
    CONTRACT_EXPIRING_SOON,
    /** Tenant submitted no-renewal intent — notifies owner + accountants. */
    NO_RENEWAL_INTENT_SUBMITTED,
    /** Accountant returned the security deposit to the tenant. */
    DEPOSIT_RETURNED,
    /** Accountant reported unit damages after contract end — notifies tenant + owner. */
    UNIT_DAMAGE_REPORTED,
    /** Tenant submitted damage payment receipt — notifies accountant + owner. */
    DAMAGE_RECEIPT_SUBMITTED,
    /** Accountant confirmed damage payment — notifies owner. */
    DAMAGE_PAYMENT_CONFIRMED,
    /** Owner or accountant cleared the unit inspection — unit is now available. */
    UNIT_CLEARED,
    /** New rental inquiry on a vacancy listing — leasing staff. */
    RENTAL_INQUIRY_RECEIVED,
    /** Vacancy listing auto-published or manually published for a unit. */
    VACANCY_PUBLISHED,
    /** Move-in or move-out inspection created for tenant. */
    INSPECTION_SCHEDULED,
    /** Inspection fully signed by tenant and inspector. */
    INSPECTION_COMPLETED
}
