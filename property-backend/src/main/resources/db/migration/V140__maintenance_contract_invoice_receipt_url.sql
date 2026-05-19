ALTER TABLE maintenance_contract_invoices
    ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500);
