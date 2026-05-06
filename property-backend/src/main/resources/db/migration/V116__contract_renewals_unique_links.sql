-- Protect renewal linkage integrity against duplicate rows from concurrent approvals.
-- One original contract can map to at most one renewal row, and each new contract can
-- be the result of at most one renewal row.
CREATE UNIQUE INDEX IF NOT EXISTS ux_contract_renewals_original_contract_id
    ON contract_renewals (original_contract_id)
    WHERE original_contract_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contract_renewals_new_contract_id
    ON contract_renewals (new_contract_id)
    WHERE new_contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_contract_renewals_original_contract_id
    ON contract_renewals (original_contract_id);
