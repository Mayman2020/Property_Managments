-- V106: Reserved units + staff change log on contracts (after lease sync migrations).
SET search_path = property_mgmt;

-- Distinguish "reserved" (draft / pending-owner lease) from "rented" (active/suspended).
-- Staff-facing activity lines on lease contracts (who did what).

ALTER TABLE units ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lease_contracts ADD COLUMN IF NOT EXISTS staff_change_log TEXT;

UPDATE units u
SET is_rented = EXISTS (
    SELECT 1
    FROM lease_contracts lc
    WHERE lc.unit_id = u.id
      AND lc.status IN ('ACTIVE', 'SUSPENDED')
),
    is_reserved = EXISTS (
        SELECT 1
        FROM lease_contracts lc
        WHERE lc.unit_id = u.id
          AND lc.status IN ('DRAFT', 'PENDING_OWNER_APPROVAL')
    )
    AND NOT EXISTS (
        SELECT 1
        FROM lease_contracts lc2
        WHERE lc2.unit_id = u.id
          AND lc2.status IN ('ACTIVE', 'SUSPENDED')
    );
