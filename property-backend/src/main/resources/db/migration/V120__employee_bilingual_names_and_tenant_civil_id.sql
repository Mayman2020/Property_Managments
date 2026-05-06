ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(150);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name_en VARCHAR(150);

UPDATE employees
SET full_name_ar = COALESCE(NULLIF(btrim(full_name), ''), 'Employee')
WHERE full_name_ar IS NULL;

UPDATE employees
SET full_name_en = COALESCE(NULLIF(btrim(full_name), ''), 'Employee')
WHERE full_name_en IS NULL;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS civil_id_image_url VARCHAR(500);
