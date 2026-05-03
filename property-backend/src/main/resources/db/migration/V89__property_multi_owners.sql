-- V89: Multi-owner support for properties
-- Adds property_owners junction table and migrates existing single-owner data.

SET search_path = property_mgmt;

CREATE TABLE IF NOT EXISTS property_owners (
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id    BIGINT NOT NULL REFERENCES owners(id)     ON DELETE CASCADE,
    PRIMARY KEY (property_id, owner_id)
);

-- Migrate existing single-owner FK into the new junction table
INSERT INTO property_owners (property_id, owner_id)
SELECT id, owner_id
FROM properties
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_property_owners_property ON property_owners(property_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_owner    ON property_owners(owner_id);
