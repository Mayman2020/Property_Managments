-- Align units.is_rented with actual ACTIVE/SUSPENDED leases (tenant list uses contracts; units list used stale flag)
UPDATE units u
SET is_rented = EXISTS (
    SELECT 1
    FROM lease_contracts lc
    WHERE lc.unit_id = u.id
      AND lc.status IN ('ACTIVE', 'SUSPENDED')
);
