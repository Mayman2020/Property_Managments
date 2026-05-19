-- V157: Contract annexes / addendums table
CREATE TABLE IF NOT EXISTS contract_annexes (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     BIGINT NOT NULL REFERENCES lease_contracts(id) ON DELETE CASCADE,
    annex_number    VARCHAR(50),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    effective_date  DATE,
    document_url    VARCHAR(500),
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_annexes_contract_id ON contract_annexes(contract_id);
