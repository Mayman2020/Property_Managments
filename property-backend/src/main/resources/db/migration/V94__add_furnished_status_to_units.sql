-- Add FURNISHED_STATUS to lookup type constraint
ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'PROPERTY_STATUS', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'VIOLATION_STATUS', 'VIOLATION_SEVERITY', 'VIOLATION_TYPE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'INSPECTION_TYPE', 'INSPECTION_CONDITION', 'FURNISHED_STATUS'
    )
);

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('FURNISHED_STATUS', 'FURNISHED',   'مفروشة',     'Furnished',   1, true, true),
('FURNISHED_STATUS', 'UNFURNISHED', 'غير مفروشة', 'Unfurnished', 2, true, true)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar    = EXCLUDED.name_ar,
    name_en    = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active  = EXCLUDED.is_active,
    is_locked  = EXCLUDED.is_locked;

-- Add furnished_status column to units
ALTER TABLE units
    ADD COLUMN IF NOT EXISTS furnished_status VARCHAR(20);
