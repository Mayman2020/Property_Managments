package com.propertymanagement.modules.notification;

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
    PAYROLL_MARKED_PAID,
    LEAVE_REQUEST_SUBMITTED,
    LEAVE_REQUEST_APPROVED,
    LEAVE_REQUEST_REJECTED,
    FINANCE_ALERT,
    MAINTENANCE_UPDATE,
    OWNER_STATEMENT,
    /** Owner portal user linked to a property via registration / property owners list. */
    PROPERTY_LINKED_TO_OWNER,
    /** A new unit was registered under a property linked to the owner portal account. */
    UNIT_ADDED_TO_OWNER_PROPERTY,
    /** Tenant profile assigned to a unit on an owner-linked property (staff tenant registration). */
    TENANT_REGISTERED_ON_OWNER_PROPERTY,
    GENERAL
}
