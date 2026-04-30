-- Add owner approval flow + free months to lease_contracts

ALTER TABLE lease_contracts
    ADD COLUMN IF NOT EXISTS free_months         INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS owner_approval_status  VARCHAR(20) DEFAULT NULL
        CHECK (owner_approval_status IN ('PENDING','APPROVED','REJECTED')),
    ADD COLUMN IF NOT EXISTS owner_approved_at   TIMESTAMP DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS owner_approved_by   BIGINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS owner_approval_notes TEXT DEFAULT NULL;

-- Extend status check to include PENDING_OWNER_APPROVAL
ALTER TABLE lease_contracts DROP CONSTRAINT IF EXISTS lease_contracts_status_check;
ALTER TABLE lease_contracts
    ADD CONSTRAINT lease_contracts_status_check
    CHECK (status IN ('DRAFT','PENDING_OWNER_APPROVAL','ACTIVE','EXPIRED','TERMINATED','RENEWED','SUSPENDED'));

-- Add free_months to contract_renewals tracking
ALTER TABLE contract_renewals
    ADD COLUMN IF NOT EXISTS free_months INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lease_contracts_owner_approval
    ON lease_contracts(owner_approval_status) WHERE owner_approval_status = 'PENDING';
