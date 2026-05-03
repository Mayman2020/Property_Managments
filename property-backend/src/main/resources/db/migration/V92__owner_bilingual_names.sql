-- Bilingual owner display names; legacy full_name kept in sync by the application
ALTER TABLE owners ALTER COLUMN full_name TYPE VARCHAR(300);

ALTER TABLE owners ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(150);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS full_name_en VARCHAR(150);

UPDATE owners
SET full_name_ar = COALESCE(NULLIF(btrim(full_name), ''), 'Owner')
WHERE full_name_ar IS NULL;

UPDATE owners
SET full_name_en = COALESCE(NULLIF(btrim(full_name), ''), 'Owner')
WHERE full_name_en IS NULL;

ALTER TABLE owners ALTER COLUMN full_name_ar SET NOT NULL;
ALTER TABLE owners ALTER COLUMN full_name_en SET NOT NULL;
