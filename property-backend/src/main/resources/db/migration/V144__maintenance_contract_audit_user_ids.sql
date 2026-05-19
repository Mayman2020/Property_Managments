-- Align maintenance contracts with lease-style audit user columns (nullable for legacy rows).
ALTER TABLE maintenance_contracts
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS modified_by BIGINT REFERENCES users (id);
