ALTER TABLE maintenance_contracts
    ADD COLUMN IF NOT EXISTS attachment_urls TEXT;
