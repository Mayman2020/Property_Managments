-- Phase 1: login IP, attachment expiry, late fee flag on schedule

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

ALTER TABLE property_attachments ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE rent_payment_schedule ADD COLUMN IF NOT EXISTS late_fee_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- Remove unused SUSPENDED lease status (no Java path sets it)
UPDATE lease_contracts SET status = 'ACTIVE' WHERE status = 'SUSPENDED';

ALTER TABLE lease_contracts DROP CONSTRAINT IF EXISTS lease_contracts_status_check;
ALTER TABLE lease_contracts ADD CONSTRAINT lease_contracts_status_check CHECK (status IN (
    'DRAFT',
    'PENDING_OWNER_APPROVAL',
    'ACTIVE',
    'EXPIRED',
    'TERMINATED',
    'RENEWED',
    'CANCELLED',
    'PENDING_TERMINATION_APPROVAL',
    'PENDING_RENEWAL_APPROVAL'
));
