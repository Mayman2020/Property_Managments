SET search_path = property_mgmt;

CREATE TABLE IF NOT EXISTS property_maintenance_providers (
    property_id   BIGINT      NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    provider_type VARCHAR(10) NOT NULL CHECK (provider_type IN ('USER', 'COMPANY')),
    provider_id   BIGINT      NOT NULL,
    PRIMARY KEY (property_id, provider_type, provider_id)
);

-- Migrate existing single-value routing fields into the junction table
INSERT INTO property_maintenance_providers (property_id, provider_type, provider_id)
SELECT id, 'USER', maintenance_internal_officer_user_id
FROM properties
WHERE maintenance_internal_officer_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO property_maintenance_providers (property_id, provider_type, provider_id)
SELECT id, 'COMPANY', maintenance_contractor_company_id
FROM properties
WHERE maintenance_contractor_company_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_prop_maint_providers ON property_maintenance_providers(property_id);
