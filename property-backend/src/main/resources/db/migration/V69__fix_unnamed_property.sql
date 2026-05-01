UPDATE properties
SET
    property_name    = 'المبنى الإداري العام',
    property_name_ar = 'المبنى الإداري العام',
    property_name_en = 'General Administrative Building',
    updated_at       = NOW()
WHERE property_name IS NULL
   OR property_name = ''
   OR property_name ~ '^[^a-zA-Zأ-ي0-9]+$';
