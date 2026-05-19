ALTER TABLE maintenance_contracts
    ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC(15, 3);
