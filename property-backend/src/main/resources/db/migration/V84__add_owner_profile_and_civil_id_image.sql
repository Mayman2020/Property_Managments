ALTER TABLE owners
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS civil_id_image_url VARCHAR(500);
