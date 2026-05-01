ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'PROPERTY_STATUS', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'VIOLATION_STATUS', 'VIOLATION_SEVERITY', 'VIOLATION_TYPE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'INSPECTION_TYPE', 'INSPECTION_CONDITION'
    )
);

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_property_type_check CHECK (
    property_type IN ('RESIDENTIAL', 'COMMERCIAL', 'MIXED', 'MIXED_USE', 'INDUSTRIAL')
);

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_unit_type_check;
ALTER TABLE units ADD CONSTRAINT units_unit_type_check CHECK (
    unit_type IN ('APARTMENT', 'SHOP', 'OFFICE', 'WAREHOUSE', 'VILLA', 'STUDIO', 'OTHER')
);

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('PROPERTY_TYPE', 'MIXED', 'مختلط', 'Mixed', 3, true, true),
('PROPERTY_STATUS', 'ACTIVE', 'نشط', 'Active', 1, true, true),
('PROPERTY_STATUS', 'INACTIVE', 'غير نشط', 'Inactive', 2, true, true)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    is_locked = EXCLUDED.is_locked;
