ALTER TABLE maintenance_contracts
    ALTER COLUMN status TYPE VARCHAR(40);

ALTER TABLE maintenance_contracts
    ADD COLUMN IF NOT EXISTS previous_contract_id BIGINT REFERENCES maintenance_contracts(id),
    ADD COLUMN IF NOT EXISTS owner_approval_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS owner_approval_notes TEXT,
    ADD COLUMN IF NOT EXISTS owner_approved_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS termination_requested_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS termination_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS termination_request_notes TEXT,
    ADD COLUMN IF NOT EXISTS termination_proposed_date DATE,
    ADD COLUMN IF NOT EXISTS termination_decision_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS termination_decision_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS termination_decision_notes TEXT,
    ADD COLUMN IF NOT EXISTS renewal_requested_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS renewal_requested_note TEXT,
    ADD COLUMN IF NOT EXISTS renewal_proposed_start_date DATE,
    ADD COLUMN IF NOT EXISTS renewal_proposed_end_date DATE,
    ADD COLUMN IF NOT EXISTS renewal_proposed_value NUMERIC(15, 3),
    ADD COLUMN IF NOT EXISTS renewal_decision_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS renewal_decision_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS renewal_decision_note TEXT,
    ADD COLUMN IF NOT EXISTS renewal_decision_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS staff_change_log TEXT;

CREATE INDEX IF NOT EXISTS idx_mc_status ON maintenance_contracts(status);
CREATE INDEX IF NOT EXISTS idx_mc_previous_contract ON maintenance_contracts(previous_contract_id);
