-- V14: Support internal/external maintenance officer accounts + company name

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS maintenance_officer_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS maintenance_company_name VARCHAR(180);

CREATE INDEX IF NOT EXISTS idx_users_officer_type ON users(maintenance_officer_type);

