-- Rent receipts uploaded by tenants monthly
CREATE TABLE rent_receipts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    contract_id BIGINT REFERENCES lease_contracts(id),
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL,
    amount NUMERIC(12,2),
    file_url VARCHAR(500) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    reviewed_by BIGINT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_receipt_tenant_period UNIQUE (tenant_id, period_year, period_month)
);

-- Contract action requests from tenants (renewal / termination)
CREATE TABLE contract_action_requests (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    contract_id BIGINT NOT NULL REFERENCES lease_contracts(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('RENEWAL','TERMINATION')),
    requested_date DATE,
    reason TEXT,
    notes TEXT,
    attachment_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    reviewed_by BIGINT,
    reviewed_at TIMESTAMP,
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rent_receipts_tenant ON rent_receipts(tenant_id);
CREATE INDEX idx_rent_receipts_contract ON rent_receipts(contract_id);
CREATE INDEX idx_contract_action_requests_tenant ON contract_action_requests(tenant_id);
CREATE INDEX idx_contract_action_requests_contract ON contract_action_requests(contract_id);
