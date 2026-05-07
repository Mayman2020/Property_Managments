-- Add missing civil ID image column required by User entity schema validation.
SET search_path = property_mgmt;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS civil_id_image_url VARCHAR(600);
