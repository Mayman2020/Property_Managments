ALTER TABLE floors ADD COLUMN IF NOT EXISTS floor_label_ar VARCHAR(50);
ALTER TABLE floors ADD COLUMN IF NOT EXISTS floor_label_en VARCHAR(50);

UPDATE floors
SET floor_label_ar = COALESCE(NULLIF(btrim(floor_label_ar), ''), NULLIF(btrim(floor_label), ''), floor_label_en)
WHERE floor_label_ar IS NULL OR btrim(floor_label_ar) = '';

UPDATE floors
SET floor_label_en = COALESCE(NULLIF(btrim(floor_label_en), ''), NULLIF(btrim(floor_label), ''), floor_label_ar)
WHERE floor_label_en IS NULL OR btrim(floor_label_en) = '';
