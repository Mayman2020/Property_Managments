-- Link properties to internal maintenance officer OR contractor company for request routing

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS maintenance_internal_officer_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS maintenance_contractor_company_id BIGINT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS contractor_company_id BIGINT;

ALTER TABLE maintenance_requests
    ADD COLUMN IF NOT EXISTS contractor_company_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_properties_internal_officer ON properties(maintenance_internal_officer_user_id);
CREATE INDEX IF NOT EXISTS idx_properties_contractor_company ON properties(maintenance_contractor_company_id);
CREATE INDEX IF NOT EXISTS idx_users_contractor_company ON users(contractor_company_id);
CREATE INDEX IF NOT EXISTS idx_maint_req_contractor_company ON maintenance_requests(contractor_company_id);

ALTER TABLE properties
    ADD CONSTRAINT fk_properties_internal_officer
        FOREIGN KEY (maintenance_internal_officer_user_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE properties
    ADD CONSTRAINT fk_properties_contractor_company
        FOREIGN KEY (maintenance_contractor_company_id) REFERENCES contractor_companies (id) ON DELETE SET NULL;

ALTER TABLE users
    ADD CONSTRAINT fk_users_contractor_company
        FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies (id) ON DELETE SET NULL;

ALTER TABLE maintenance_requests
    ADD CONSTRAINT fk_maint_req_contractor_company
        FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies (id) ON DELETE SET NULL;
