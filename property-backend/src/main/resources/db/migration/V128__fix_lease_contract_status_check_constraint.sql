-- V128: Add PENDING_TERMINATION_APPROVAL and PENDING_RENEWAL_APPROVAL to the
-- lease_contracts status check constraint.
-- These two values were added to the ContractStatus Java enum but the database
-- constraint was last updated in V102 and never extended, causing every
-- termination/renewal request to fail with a constraint violation.

SET search_path = property_mgmt;

ALTER TABLE lease_contracts
    DROP CONSTRAINT IF EXISTS lease_contracts_status_check;

ALTER TABLE lease_contracts
    ADD CONSTRAINT lease_contracts_status_check
    CHECK (status IN (
        'DRAFT',
        'PENDING_OWNER_APPROVAL',
        'ACTIVE',
        'EXPIRED',
        'TERMINATED',
        'RENEWED',
        'SUSPENDED',
        'CANCELLED',
        'PENDING_TERMINATION_APPROVAL',
        'PENDING_RENEWAL_APPROVAL'
    ));
