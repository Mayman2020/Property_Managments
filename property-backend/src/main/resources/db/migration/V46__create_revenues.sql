-- V46: Other revenues
CREATE TABLE IF NOT EXISTS revenue_categories (
    id BIGSERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name_ar VARCHAR(200) NOT NULL,
    category_name_en VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO revenue_categories (category_code, category_name_ar, category_name_en)
VALUES
('REV-RENT', '???????', 'Rent'),
('REV-DEPOSIT', '??????? ??????', 'Deposits'),
('REV-FINE', '?????? ????? ???????', 'Fines'),
('REV-SERVICE', '???? ?????', 'Service fees'),
('REV-PARKING', '???? ?????', 'Parking fees'),
('REV-COMMERCIAL', '??????? ??????', 'Commercial income'),
('REV-OTHER', '??????? ????', 'Other income')
ON CONFLICT (category_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS other_revenues (
    id BIGSERIAL PRIMARY KEY,
    revenue_number VARCHAR(50) UNIQUE NOT NULL,
    property_id BIGINT REFERENCES properties(id),
    category_id BIGINT REFERENCES revenue_categories(id),
    tenant_id BIGINT REFERENCES tenants(id),
    contract_id BIGINT REFERENCES lease_contracts(id),
    description TEXT NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    revenue_date DATE NOT NULL,
    payment_method VARCHAR(30),
    reference_number VARCHAR(100),
    receipt_url VARCHAR(500),
    notes TEXT,
    recorded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_revenues_property ON other_revenues(property_id);
