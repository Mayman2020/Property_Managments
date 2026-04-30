-- V50: Petty cash
CREATE TABLE IF NOT EXISTS petty_cash_funds (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    fund_name VARCHAR(150) NOT NULL,
    custodian_id BIGINT REFERENCES employees(id),
    opening_balance DECIMAL(12,2) NOT NULL,
    current_balance DECIMAL(12,2) NOT NULL,
    max_transaction DECIMAL(10,2) DEFAULT 500,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id BIGSERIAL PRIMARY KEY,
    fund_id BIGINT REFERENCES petty_cash_funds(id),
    transaction_type VARCHAR(10) CHECK (transaction_type IN ('IN','OUT')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT REFERENCES expense_categories(id),
    receipt_url VARCHAR(500),
    balance_after DECIMAL(12,2),
    performed_by BIGINT REFERENCES employees(id),
    approved_by BIGINT REFERENCES users(id),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
