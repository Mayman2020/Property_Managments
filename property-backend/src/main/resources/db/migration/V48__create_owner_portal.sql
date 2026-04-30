-- V48: Owner portal tables
ALTER TABLE owners ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS owner_statements (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES owners(id),
    property_id BIGINT REFERENCES properties(id),
    statement_month INT NOT NULL,
    statement_year INT NOT NULL,
    total_rent_collected DECIMAL(14,2) DEFAULT 0,
    total_other_revenue DECIMAL(14,2) DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    total_maintenance DECIMAL(14,2) DEFAULT 0,
    total_payroll DECIMAL(14,2) DEFAULT 0,
    total_utilities DECIMAL(14,2) DEFAULT 0,
    total_admin DECIMAL(14,2) DEFAULT 0,
    total_expenses DECIMAL(14,2) DEFAULT 0,
    net_income DECIMAL(14,2) DEFAULT 0,
    management_fee_pct DECIMAL(5,2) DEFAULT 0,
    management_fee_amount DECIMAL(12,2) DEFAULT 0,
    owner_net_amount DECIMAL(14,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','CONFIRMED')),
    pdf_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, property_id, statement_year, statement_month)
);
