-- V155: Add floor_plan_url to units for storing floor plan document/image links
ALTER TABLE units ADD COLUMN IF NOT EXISTS floor_plan_url VARCHAR(500);
