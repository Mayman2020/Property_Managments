SET search_path = property_mgmt;

ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'PROPERTY_STATUS', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'FURNISHED_STATUS',
        'CURRENCY', 'MONTH', 'YEAR', 'RENT_DISCOUNT_REASON', 'CONTRACT_DRAFT_AMEND_REASON'
    )
);

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('PAYMENT_METHOD', 'CASH', 'نقدا', 'Cash', 1, true, true),
('PAYMENT_METHOD', 'BANK_TRANSFER', 'تحويل بنكي', 'Bank Transfer', 2, true, true),
('PAYMENT_METHOD', 'CHECK', 'شيك', 'Check', 3, true, true),
('PAYMENT_METHOD', 'ONLINE', 'دفع إلكتروني', 'Online Payment', 4, true, true),
('PAYMENT_METHOD', 'OTHER', 'أخرى', 'Other', 99, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('MONTH', '01', 'يناير', 'January', 1, true, true),
('MONTH', '02', 'فبراير', 'February', 2, true, true),
('MONTH', '03', 'مارس', 'March', 3, true, true),
('MONTH', '04', 'أبريل', 'April', 4, true, true),
('MONTH', '05', 'مايو', 'May', 5, true, true),
('MONTH', '06', 'يونيو', 'June', 6, true, true),
('MONTH', '07', 'يوليو', 'July', 7, true, true),
('MONTH', '08', 'أغسطس', 'August', 8, true, true),
('MONTH', '09', 'سبتمبر', 'September', 9, true, true),
('MONTH', '10', 'أكتوبر', 'October', 10, true, true),
('MONTH', '11', 'نوفمبر', 'November', 11, true, true),
('MONTH', '12', 'ديسمبر', 'December', 12, true, true)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked)
SELECT 'YEAR', y::text, y::text, y::text, y - 2019, true, true
FROM generate_series(2020, 2035) AS y
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;
