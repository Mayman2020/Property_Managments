-- V105: Extend lookup types and seed currency / discount / draft-amend reasons.
SET search_path = property_mgmt;

-- LookupType enum values (e.g. CONTRACT_DRAFT_AMEND_REASON) can exceed legacy VARCHAR(20).
ALTER TABLE lookups ALTER COLUMN type TYPE VARCHAR(50);

ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'PROPERTY_STATUS', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'FURNISHED_STATUS',
        'CURRENCY', 'RENT_DISCOUNT_REASON', 'CONTRACT_DRAFT_AMEND_REASON'
    )
);

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('CURRENCY', 'OMR', 'ريال عماني', 'Omani Rial', 1, true, false),
('CURRENCY', 'SAR', 'ريال سعودي', 'Saudi Riyal', 2, true, false),
('CURRENCY', 'USD', 'دولار أمريكي', 'US Dollar', 3, true, false),
('CURRENCY', 'AED', 'درهم إماراتي', 'UAE Dirham', 4, true, false),
('CURRENCY', 'KWD', 'دينار كويتي', 'Kuwaiti Dinar', 5, true, false),
('CURRENCY', 'BHD', 'دينار بحريني', 'Bahraini Dinar', 6, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('RENT_DISCOUNT_REASON', 'OWNER_AGREEMENT', 'موافقة صاحب العقار', 'Owner agreement', 1, true, false),
('RENT_DISCOUNT_REASON', 'OLD_TENANT', 'مستأجر قديم', 'Previous tenant', 2, true, false),
('RENT_DISCOUNT_REASON', 'OTHER', 'سبب آخر', 'Other reason', 99, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('CONTRACT_DRAFT_AMEND_REASON', 'PRICE_ADJUSTMENT', 'تعديل السعر (تخفيض مصرّح)', 'Price adjustment (authorized)', 10, true, false),
('CONTRACT_DRAFT_AMEND_REASON', 'TENANT_FREE', 'مجانية / تساهل للمستأجر', 'Free / concession for tenant', 20, true, false),
('CONTRACT_DRAFT_AMEND_REASON', 'EMPLOYEE_DISCOUNT', 'تأجير لموظف بخصم', 'Employee rent with discount', 30, true, false),
('CONTRACT_DRAFT_AMEND_REASON', 'DATA_CORRECTION', 'تصحيح بيانات', 'Data correction', 40, true, false),
('CONTRACT_DRAFT_AMEND_REASON', 'OTHER', 'أخرى', 'Other', 50, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
