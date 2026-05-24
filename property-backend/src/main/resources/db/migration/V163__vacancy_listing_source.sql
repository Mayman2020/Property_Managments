-- Phase 2B: vacancy listing source (manual vs auto-published on contract end)
ALTER TABLE vacancy_listings
    ADD COLUMN IF NOT EXISTS listing_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE vacancy_listings DROP CONSTRAINT IF EXISTS vacancy_listings_listing_source_check;
ALTER TABLE vacancy_listings ADD CONSTRAINT vacancy_listings_listing_source_check
    CHECK (listing_source IN ('MANUAL', 'AUTO_PUBLISHED'));

UPDATE vacancy_listings SET listing_source = 'MANUAL' WHERE listing_source IS NULL;
