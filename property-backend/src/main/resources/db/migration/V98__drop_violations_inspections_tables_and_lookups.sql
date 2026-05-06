SET search_path = property_mgmt;

-- Lookup values for removed contract features
DELETE FROM lookups WHERE type IN (
    'VIOLATION_STATUS',
    'VIOLATION_SEVERITY',
    'VIOLATION_TYPE',
    'INSPECTION_TYPE',
    'INSPECTION_CONDITION'
);

-- Inspection photos reference unit_inspections
DROP TABLE IF EXISTS inspection_photos CASCADE;
DROP TABLE IF EXISTS unit_inspections CASCADE;
DROP TABLE IF EXISTS tenant_violations CASCADE;

-- Allow lookup type constraint without violation/inspection enums (aligned with V94 minus removed types)
ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'PROPERTY_STATUS', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'FURNISHED_STATUS'
    )
);
