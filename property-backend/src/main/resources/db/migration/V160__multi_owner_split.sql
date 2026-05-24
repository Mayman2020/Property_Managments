-- Phase 2: co-owner ownership percentages and rent revenue share ledger

ALTER TABLE property_owners
    ADD COLUMN IF NOT EXISTS ownership_percentage DECIMAL(5,2) NOT NULL DEFAULT 100;

ALTER TABLE property_owners
    DROP CONSTRAINT IF EXISTS property_owners_ownership_percentage_check;

ALTER TABLE property_owners
    ADD CONSTRAINT property_owners_ownership_percentage_check
        CHECK (ownership_percentage > 0 AND ownership_percentage <= 100);

-- Equal split for properties with multiple owners
UPDATE property_owners po
SET ownership_percentage = ROUND(100.0 / cnt.c, 2)
FROM (
    SELECT property_id, COUNT(*)::numeric AS c
    FROM property_owners
    GROUP BY property_id
    HAVING COUNT(*) > 1
) cnt
WHERE po.property_id = cnt.property_id;

CREATE TABLE IF NOT EXISTS owner_revenue_shares (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES owners(id),
    property_id BIGINT NOT NULL REFERENCES properties(id),
    rent_payment_id BIGINT NOT NULL REFERENCES rent_payments(id),
    amount DECIMAL(14,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (rent_payment_id, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_revenue_shares_owner_period
    ON owner_revenue_shares (owner_id, year, month);

CREATE INDEX IF NOT EXISTS idx_owner_revenue_shares_property_period
    ON owner_revenue_shares (property_id, year, month);
