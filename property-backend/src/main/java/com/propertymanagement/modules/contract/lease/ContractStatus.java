package com.propertymanagement.modules.contract.lease;

public enum ContractStatus {
    DRAFT,
    PENDING_OWNER_APPROVAL,
    ACTIVE,
    EXPIRED,
    TERMINATED,
    RENEWED,
    SUSPENDED,
    /** Draft withdrawn by owner or admin — unit occupancy recomputed without this row. */
    CANCELLED,
    /**
     * Staff submitted a termination/handover request; contract stays effectively ACTIVE
     * (schedule untouched, unit still rented) until the owner approves or rejects via the
     * owner portal. Approval finalises to {@link #TERMINATED}; rejection reverts to {@link #ACTIVE}.
     */
    PENDING_TERMINATION_APPROVAL,
    /**
     * Staff submitted a renewal request with proposed dates/rent. Contract remains ACTIVE
     * until owner decision from owner portal. Approval materialises the renewal according to
     * the existing project renewal pattern; rejection/cancel returns this contract to ACTIVE.
     */
    PENDING_RENEWAL_APPROVAL
}
