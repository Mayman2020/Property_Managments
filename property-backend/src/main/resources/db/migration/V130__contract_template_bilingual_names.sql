ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS template_name_ar VARCHAR(200);
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS template_name_en VARCHAR(200);

UPDATE contract_templates
SET template_name_ar = COALESCE(NULLIF(btrim(template_name_ar), ''), NULLIF(btrim(template_name), ''), template_name_en)
WHERE template_name_ar IS NULL OR btrim(template_name_ar) = '';

UPDATE contract_templates
SET template_name_en = COALESCE(NULLIF(btrim(template_name_en), ''), NULLIF(btrim(template_name), ''), template_name_ar)
WHERE template_name_en IS NULL OR btrim(template_name_en) = '';
