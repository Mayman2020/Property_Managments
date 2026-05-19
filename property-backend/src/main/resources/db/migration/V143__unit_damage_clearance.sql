-- V143: Unit damage and clearance tracking
-- Adds damage notes and clearance audit fields to units so accountant/owner can
-- mark a unit as inspected and available after a tenant vacates.

ALTER TABLE units
    ADD COLUMN IF NOT EXISTS damage_notes TEXT,
    ADD COLUMN IF NOT EXISTS has_damage   BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cleared_at   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cleared_by   BIGINT;
