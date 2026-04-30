-- Contract Renewal History (تجديدات العقد)
CREATE TABLE contract_renewals (
    id                      BIGSERIAL PRIMARY KEY,
    original_contract_id    BIGINT REFERENCES lease_contracts(id),
    new_contract_id         BIGINT REFERENCES lease_contracts(id),
    renewal_date            DATE NOT NULL,
    new_start_date          DATE NOT NULL,
    new_end_date            DATE NOT NULL,
    old_monthly_rent        DECIMAL(12,2),
    new_monthly_rent        DECIMAL(12,2),
    rent_increase_pct       DECIMAL(5,2),
    notes                   TEXT,
    renewed_by              BIGINT REFERENCES users(id),
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Contract Expiry Notifications (تنبيهات انتهاء العقد)
CREATE TABLE contract_notifications (
    id                  BIGSERIAL PRIMARY KEY,
    contract_id         BIGINT REFERENCES lease_contracts(id),
    notification_type   VARCHAR(30) CHECK (notification_type IN (
                            'EXPIRY_90_DAYS','EXPIRY_60_DAYS','EXPIRY_30_DAYS',
                            'EXPIRY_15_DAYS','OVERDUE_RENT','CONTRACT_EXPIRED')),
    sent_at             TIMESTAMP,
    is_sent             BOOLEAN DEFAULT FALSE,
    recipient_type      VARCHAR(20) CHECK (recipient_type IN ('TENANT','ADMIN','OWNER')),
    notes               TEXT
);
