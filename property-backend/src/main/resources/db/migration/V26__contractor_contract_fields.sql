-- Contract period and attachment URLs for contractor companies

ALTER TABLE contractor_companies
    ADD COLUMN IF NOT EXISTS contract_start DATE,
    ADD COLUMN IF NOT EXISTS contract_end DATE,
    ADD COLUMN IF NOT EXISTS attachment_files TEXT;
