-- Termination request / approval workflow on lease contracts.
-- Existing termination_* columns (date, reason, deposit_return, has_damages, damages_amount,
-- damages_tenant_paid) carry the *proposed* handover values while the contract is in
-- PENDING_TERMINATION_APPROVAL, then become final on approval (or are cleared on rejection).
ALTER TABLE lease_contracts ADD COLUMN termination_requested_by BIGINT;
ALTER TABLE lease_contracts ADD COLUMN termination_requested_at TIMESTAMP;
ALTER TABLE lease_contracts ADD COLUMN termination_request_notes TEXT;

ALTER TABLE lease_contracts ADD COLUMN termination_decision_by BIGINT;
ALTER TABLE lease_contracts ADD COLUMN termination_decision_at TIMESTAMP;
ALTER TABLE lease_contracts ADD COLUMN termination_decision_notes TEXT;
