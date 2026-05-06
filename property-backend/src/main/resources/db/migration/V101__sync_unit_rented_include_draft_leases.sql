-- Align with LeaseContractService: DRAFT + ACTIVE + SUSPENDED on a unit => is_rented
UPDATE units u
SET is_rented = EXISTS (
    SELECT 1
    FROM lease_contracts lc
    WHERE lc.unit_id = u.id
      AND lc.status IN ('DRAFT', 'ACTIVE', 'SUSPENDED')
);
