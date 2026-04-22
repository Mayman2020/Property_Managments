-- V19: Add Google map URL to properties
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS google_map_url VARCHAR(1000);
