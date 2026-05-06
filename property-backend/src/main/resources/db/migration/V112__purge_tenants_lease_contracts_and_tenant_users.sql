-- V112: Remove all tenant records, lease (tenant) contracts and related rows, and users with role TENANT.
-- Keeps: SUPER_ADMIN, OWNER, and all staff roles, plus properties, units, owners, finance, HR, maintenance, etc.
-- Deletes lease rows (not TRUNCATE) so FK peers like other_revenues are not pulled in or blocked by PostgreSQL RESTRICT rules.
SET search_path = property_mgmt;

UPDATE property_mgmt.maintenance_requests SET tenant_id = NULL WHERE tenant_id IS NOT NULL;
UPDATE property_mgmt.other_revenues SET tenant_id = NULL, contract_id = NULL;
UPDATE property_mgmt.visit_ratings SET tenant_id = NULL WHERE tenant_id IS NOT NULL;

UPDATE property_mgmt.properties SET maintenance_internal_officer_user_id = NULL
WHERE maintenance_internal_officer_user_id IN (SELECT id FROM property_mgmt.users WHERE role = 'TENANT');

DELETE FROM property_mgmt.property_maintenance_providers
WHERE provider_type = 'USER'
  AND provider_id IN (SELECT id FROM property_mgmt.users WHERE role = 'TENANT');

DELETE FROM property_mgmt.property_maintenance_assignments
WHERE maintenance_provider_id IN (
    SELECT mp.id FROM property_mgmt.maintenance_providers mp
    WHERE mp.user_id IN (SELECT id FROM property_mgmt.users WHERE role = 'TENANT')
);
DELETE FROM property_mgmt.maintenance_providers
WHERE user_id IN (SELECT id FROM property_mgmt.users WHERE role = 'TENANT');

UPDATE property_mgmt.employees SET linked_user_id = NULL
WHERE linked_user_id IN (SELECT id FROM property_mgmt.users WHERE role = 'TENANT');

DELETE FROM property_mgmt.audit_logs
WHERE user_id IN (SELECT id FROM property_mgmt.users WHERE role = 'TENANT');

-- Lease / tenant portal: DELETE in dependency order (avoids TRUNCATE + FK issues between
-- rent_payments/rent_payment_schedule and lease_contracts vs other_revenues).
DELETE FROM property_mgmt.contract_action_requests;
DELETE FROM property_mgmt.rent_receipts;
DELETE FROM property_mgmt.rent_payments;
DELETE FROM property_mgmt.rent_payment_schedule;
DELETE FROM property_mgmt.contract_attachments;
DELETE FROM property_mgmt.contract_clauses;
DELETE FROM property_mgmt.contract_renewals;
DELETE FROM property_mgmt.contract_notifications;
DELETE FROM property_mgmt.contract_fees;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'property_mgmt' AND table_name = 'contract_requests'
    ) THEN
        DELETE FROM property_mgmt.contract_requests;
    END IF;
END $$;
DELETE FROM property_mgmt.lease_contracts;
DELETE FROM property_mgmt.tenant_complaints;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'property_mgmt' AND table_name = 'tenant_owner_attachments'
    ) THEN
        DELETE FROM property_mgmt.tenant_owner_attachments;
    END IF;
END $$;

DELETE FROM property_mgmt.tenants;

SELECT setval(
    (SELECT pg_get_serial_sequence('property_mgmt.tenants', 'id')),
    1,
    false
);

DELETE FROM property_mgmt.users WHERE role = 'TENANT';

UPDATE property_mgmt.units SET is_rented = FALSE, is_reserved = FALSE;

DELETE FROM property_mgmt.code_generation_state WHERE code_type IN ('TEN', 'CNT');
