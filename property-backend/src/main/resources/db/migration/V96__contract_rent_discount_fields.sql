-- Add rent discount and free month fields to lease_contracts
ALTER TABLE lease_contracts ADD COLUMN has_free_month BOOLEAN DEFAULT FALSE;
ALTER TABLE lease_contracts ADD COLUMN rent_discount_reason VARCHAR(50);
ALTER TABLE lease_contracts ADD COLUMN other_reason_text TEXT;