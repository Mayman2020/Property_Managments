-- Properties created via API/tests often omitted city/country; backfill for list display.
UPDATE property_mgmt.properties
SET city = 'مسقط'
WHERE city IS NULL OR TRIM(city) = '';

UPDATE property_mgmt.properties
SET country = 'سلطنة عمان'
WHERE country IS NULL OR TRIM(country) = '';
