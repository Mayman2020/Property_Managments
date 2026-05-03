-- Drop dependent view before altering column type
DROP VIEW IF EXISTS tenant_balance;

-- Bilingual tenant display names; legacy full_name kept in sync by the application
ALTER TABLE tenants ALTER COLUMN full_name TYPE VARCHAR(300);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(150);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS full_name_en VARCHAR(150);

UPDATE tenants
SET full_name_ar = COALESCE(NULLIF(btrim(full_name), ''), 'Tenant')
WHERE full_name_ar IS NULL;

UPDATE tenants
SET full_name_en = COALESCE(NULLIF(btrim(full_name), ''), 'Tenant')
WHERE full_name_en IS NULL;

ALTER TABLE tenants ALTER COLUMN full_name_ar SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN full_name_en SET NOT NULL;

-- Recreate the view
CREATE OR REPLACE VIEW tenant_balance AS
SELECT
    t.id                    AS tenant_id,
    t.full_name,
    lc.contract_number,
    lc.monthly_rent,
    COALESCE(SUM(CASE WHEN rps.status = 'OVERDUE' THEN rps.amount ELSE 0 END), 0) AS overdue_amount,
    COALESCE(SUM(CASE WHEN rps.status = 'PENDING' THEN rps.amount ELSE 0 END), 0)  AS pending_amount,
    COUNT(CASE WHEN rps.status = 'OVERDUE' THEN 1 END) AS overdue_months
FROM tenants t
JOIN lease_contracts lc ON lc.tenant_id = t.id AND lc.status = 'ACTIVE'
LEFT JOIN rent_payment_schedule rps ON rps.contract_id = lc.id
GROUP BY t.id, t.full_name, lc.contract_number, lc.monthly_rent;
