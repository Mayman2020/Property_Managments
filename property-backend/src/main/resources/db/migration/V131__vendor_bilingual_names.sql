ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_name_ar VARCHAR(200);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_name_en VARCHAR(200);

UPDATE vendors
SET vendor_name_ar = COALESCE(NULLIF(btrim(vendor_name_ar), ''), NULLIF(btrim(vendor_name), ''), vendor_name_en)
WHERE vendor_name_ar IS NULL OR btrim(vendor_name_ar) = '';

UPDATE vendors
SET vendor_name_en = COALESCE(NULLIF(btrim(vendor_name_en), ''), NULLIF(btrim(vendor_name), ''), vendor_name_ar)
WHERE vendor_name_en IS NULL OR btrim(vendor_name_en) = '';
