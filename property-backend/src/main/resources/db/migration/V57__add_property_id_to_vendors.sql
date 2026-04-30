ALTER TABLE property_mgmt.vendors
    ADD COLUMN IF NOT EXISTS property_id BIGINT REFERENCES property_mgmt.properties(id);

CREATE INDEX IF NOT EXISTS idx_vendors_property
    ON property_mgmt.vendors(property_id);
