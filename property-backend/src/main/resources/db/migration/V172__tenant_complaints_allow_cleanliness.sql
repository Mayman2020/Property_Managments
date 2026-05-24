-- BUG-011: V165 seeded "CLEANLINESS" into the COMPLAINT_TYPE lookup table, but
-- the V33 DB CHECK on tenant_complaints.complaint_type still only allowed
-- {NEIGHBOR_NOISE, COMMON_AREA, SECURITY, MANAGEMENT, SERVICE, OTHER}. Any
-- complaint POSTed with complaint_type='CLEANLINESS' (a value the product
-- lookup advertises as valid) violated the CHECK and surfaced as
-- DataIntegrityViolationException → HTTP 500. Re-align the CHECK with the
-- lookup row set so the value the API documents as valid is actually accepted.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'property_mgmt'
          AND t.relname = 'tenant_complaints'
          AND c.conname = 'tenant_complaints_complaint_type_check'
    ) THEN
        EXECUTE 'ALTER TABLE property_mgmt.tenant_complaints DROP CONSTRAINT tenant_complaints_complaint_type_check';
    END IF;

    EXECUTE 'ALTER TABLE property_mgmt.tenant_complaints
        ADD CONSTRAINT tenant_complaints_complaint_type_check
        CHECK (complaint_type IS NULL OR complaint_type IN (
            ''NEIGHBOR_NOISE'',''COMMON_AREA'',''CLEANLINESS'',
            ''SECURITY'',''MANAGEMENT'',''SERVICE'',''OTHER''
        ))';
END $$;
