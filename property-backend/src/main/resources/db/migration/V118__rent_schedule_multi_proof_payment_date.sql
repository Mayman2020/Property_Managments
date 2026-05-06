ALTER TABLE rent_payment_schedule
    ADD COLUMN IF NOT EXISTS proof_urls TEXT,
    ADD COLUMN IF NOT EXISTS proof_payment_date DATE;
