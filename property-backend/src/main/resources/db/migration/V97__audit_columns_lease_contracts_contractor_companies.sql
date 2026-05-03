SET search_path = property_mgmt;

ALTER TABLE lease_contracts
    ADD COLUMN IF NOT EXISTS modified_by BIGINT REFERENCES users (id);

ALTER TABLE contractor_companies
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users (id);

ALTER TABLE contractor_companies
    ADD COLUMN IF NOT EXISTS modified_by BIGINT REFERENCES users (id);
