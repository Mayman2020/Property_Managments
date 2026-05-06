-- Renewal request / owner-decision workflow on lease contracts.
-- These columns store the proposed renewal data while the contract is
-- PENDING_RENEWAL_APPROVAL. Existing dates/rent stay unchanged until approval.
ALTER TABLE lease_contracts ADD COLUMN renewal_requested_by BIGINT;
ALTER TABLE lease_contracts ADD COLUMN renewal_requested_at TIMESTAMP;
ALTER TABLE lease_contracts ADD COLUMN renewal_requested_note TEXT;

ALTER TABLE lease_contracts ADD COLUMN renewal_proposed_start_date DATE;
ALTER TABLE lease_contracts ADD COLUMN renewal_proposed_end_date DATE;
ALTER TABLE lease_contracts ADD COLUMN renewal_proposed_rent_amount DECIMAL(12, 2);

ALTER TABLE lease_contracts ADD COLUMN renewal_decision_by BIGINT;
ALTER TABLE lease_contracts ADD COLUMN renewal_decision_at TIMESTAMP;
ALTER TABLE lease_contracts ADD COLUMN renewal_decision_note TEXT;
ALTER TABLE lease_contracts ADD COLUMN renewal_decision_status VARCHAR(20);
