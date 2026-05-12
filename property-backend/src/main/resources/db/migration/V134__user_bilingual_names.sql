ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_en VARCHAR(150);

UPDATE users
SET full_name_ar = COALESCE(NULLIF(btrim(full_name), ''), 'User')
WHERE full_name_ar IS NULL;

UPDATE users
SET full_name_en = COALESCE(NULLIF(btrim(full_name), ''), 'User')
WHERE full_name_en IS NULL;

UPDATE users
SET full_name = COALESCE(NULLIF(btrim(full_name), ''), full_name_ar, full_name_en, 'User')
WHERE full_name IS NULL OR btrim(full_name) = '';
