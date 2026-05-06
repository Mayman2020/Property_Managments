ALTER TABLE rent_payment_schedule
    ADD COLUMN IF NOT EXISTS proof_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS proof_notes TEXT,
    ADD COLUMN IF NOT EXISTS proof_payment_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS proof_reference_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS proof_submitted_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE rent_payment_schedule
    DROP CONSTRAINT IF EXISTS rent_payment_schedule_status_check;

ALTER TABLE rent_payment_schedule
    ADD CONSTRAINT rent_payment_schedule_status_check
        CHECK (status IN (
            'PENDING',
            'PENDING_CONFIRMATION',
            'PAYMENT_REJECTED',
            'PAID',
            'OVERDUE',
            'PARTIAL',
            'WAIVED'
        ));

CREATE INDEX IF NOT EXISTS idx_rent_schedule_proof_status
    ON rent_payment_schedule(status, proof_submitted_at);
