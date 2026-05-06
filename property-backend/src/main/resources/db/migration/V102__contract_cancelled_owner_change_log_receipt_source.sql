SET search_path = property_mgmt;

-- Allow cancelled draft contracts (owner rejection / withdrawal)
ALTER TABLE lease_contracts DROP CONSTRAINT IF EXISTS lease_contracts_status_check;
ALTER TABLE lease_contracts
    ADD CONSTRAINT lease_contracts_status_check
    CHECK (status IN (
        'DRAFT',
        'PENDING_OWNER_APPROVAL',
        'ACTIVE',
        'EXPIRED',
        'TERMINATED',
        'RENEWED',
        'SUSPENDED',
        'CANCELLED'
    ));

-- Append-only audit text: owner amendments before activation (e.g. unit/rent change + reason)
ALTER TABLE lease_contracts
    ADD COLUMN IF NOT EXISTS owner_change_log TEXT;

-- Tenant vs staff-uploaded receipt (staff = trusted, no accountant approval loop)
ALTER TABLE rent_receipts
    ADD COLUMN IF NOT EXISTS upload_source VARCHAR(20) NOT NULL DEFAULT 'TENANT';

ALTER TABLE rent_receipts DROP CONSTRAINT IF EXISTS rent_receipts_upload_source_check;
ALTER TABLE rent_receipts
    ADD CONSTRAINT rent_receipts_upload_source_check
    CHECK (upload_source IN ('TENANT', 'STAFF'));
