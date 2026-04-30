-- Drop old constraint and recreate with UNIT_OF_MEASURE
ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'VIOLATION_STATUS', 'VIOLATION_SEVERITY', 'VIOLATION_TYPE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'INSPECTION_TYPE', 'INSPECTION_CONDITION'
    )
);

-- Seed some common units of measure
INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('UNIT_OF_MEASURE', 'PCS', 'حبة', 'Pieces', 1, true, false),
('UNIT_OF_MEASURE', 'MTR', 'متر', 'Meter', 2, true, false),
('UNIT_OF_MEASURE', 'PKT', 'باكيت', 'Packet', 3, true, false),
('UNIT_OF_MEASURE', 'BOX', 'صندوق', 'Box', 4, true, false),
('UNIT_OF_MEASURE', 'SET', 'طقم', 'Set', 5, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;
