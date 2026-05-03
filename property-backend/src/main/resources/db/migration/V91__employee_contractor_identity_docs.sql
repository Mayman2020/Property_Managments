ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS national_id VARCHAR(30),
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS civil_id_image_url VARCHAR(500);

ALTER TABLE contractor_companies
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS civil_id_image_url VARCHAR(500);
