-- V20: Allow tenant assignment to full property and expose unit linkage
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS property_id BIGINT REFERENCES properties(id);

CREATE INDEX IF NOT EXISTS idx_tenants_property ON tenants(property_id);
