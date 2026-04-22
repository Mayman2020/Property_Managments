ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS property_name_ar VARCHAR(200),
    ADD COLUMN IF NOT EXISTS property_name_en VARCHAR(200);

UPDATE properties
SET property_name_ar = COALESCE(NULLIF(property_name_ar, ''), property_name),
    property_name_en = COALESCE(NULLIF(property_name_en, ''), property_name)
WHERE property_name IS NOT NULL;

ALTER TABLE contractor_companies
    ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200),
    ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);

UPDATE contractor_companies
SET name_ar = COALESCE(NULLIF(name_ar, ''), name),
    name_en = COALESCE(NULLIF(name_en, ''), name)
WHERE name IS NOT NULL;
