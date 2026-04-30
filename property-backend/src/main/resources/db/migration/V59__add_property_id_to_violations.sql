-- Add property_id to tenant_violations for direct property-scoped queries
ALTER TABLE property_mgmt.tenant_violations
    ADD COLUMN IF NOT EXISTS property_id BIGINT;

-- Back-fill from unit -> property where possible
UPDATE property_mgmt.tenant_violations tv
SET property_id = u.property_id
FROM property_mgmt.units u
WHERE tv.unit_id = u.id
  AND tv.property_id IS NULL;
