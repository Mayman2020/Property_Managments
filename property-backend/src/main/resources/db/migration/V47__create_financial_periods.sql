-- V47: Financial periods and budgets
CREATE TABLE IF NOT EXISTS financial_periods (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    period_name VARCHAR(100),
    period_type VARCHAR(20) CHECK (period_type IN ('MONTHLY','QUARTERLY','ANNUAL')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','LOCKED')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    financial_period_id BIGINT REFERENCES financial_periods(id),
    category_id BIGINT REFERENCES expense_categories(id),
    budgeted_amount DECIMAL(14,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, financial_period_id, category_id)
);
