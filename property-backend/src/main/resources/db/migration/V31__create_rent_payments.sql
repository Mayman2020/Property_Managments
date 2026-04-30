-- Rent Payment Schedule (جدول دفعات الإيجار)
CREATE TABLE rent_payment_schedule (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     BIGINT REFERENCES lease_contracts(id) ON DELETE CASCADE,
    due_date        DATE NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    period_from     DATE,
    period_to       DATE,
    status          VARCHAR(20) DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PAID','OVERDUE','PARTIAL','WAIVED')),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Rent Payments (المدفوعات الفعلية)
CREATE TABLE rent_payments (
    id                  BIGSERIAL PRIMARY KEY,
    schedule_id         BIGINT REFERENCES rent_payment_schedule(id),
    contract_id         BIGINT REFERENCES lease_contracts(id),
    tenant_id           BIGINT REFERENCES tenants(id),

    payment_date        DATE NOT NULL,
    amount_paid         DECIMAL(12,2) NOT NULL,
    amount_due          DECIMAL(12,2) NOT NULL,
    balance             DECIMAL(12,2) GENERATED ALWAYS AS (amount_paid - amount_due) STORED,

    payment_method      VARCHAR(30) CHECK (payment_method IN (
                            'CASH','BANK_TRANSFER','CHECK','ONLINE','OTHER')),
    reference_number    VARCHAR(100),
    receipt_url         VARCHAR(500),

    late_fee            DECIMAL(10,2) DEFAULT 0,
    discount            DECIMAL(10,2) DEFAULT 0,

    notes               TEXT,
    recorded_by         BIGINT REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Other Fees (رسوم إضافية)
CREATE TABLE contract_fees (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     BIGINT REFERENCES lease_contracts(id),
    fee_type        VARCHAR(50) CHECK (fee_type IN (
                        'ELECTRICITY','WATER','GAS','SERVICE_CHARGE',
                        'PARKING','MAINTENANCE_CHARGE','PENALTY','OTHER')),
    description     VARCHAR(300),
    amount          DECIMAL(12,2) NOT NULL,
    due_date        DATE,
    is_paid         BOOLEAN DEFAULT FALSE,
    paid_date       DATE,
    receipt_url     VARCHAR(500),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
