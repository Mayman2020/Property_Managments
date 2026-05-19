-- V145: Purge all contractor company data (test data cleanup)
-- Deletion order respects all FK constraints:
--   maintenance_contract_invoices
--   → maintenance_contracts
--   → property_maintenance_assignments (via COMPANY providers)
--   → maintenance_providers (COMPANY type)
--   → employees.linked_user_id (unlink only)
--   → users (MAINTENANCE_COMPANY role)
--   → contractor_companies

-- 1. Maintenance contract invoices
DELETE FROM property_mgmt.maintenance_contract_invoices
WHERE contractor_company_id IN (SELECT id FROM property_mgmt.contractor_companies);

-- 2. Maintenance contracts
DELETE FROM property_mgmt.maintenance_contracts
WHERE contractor_company_id IN (SELECT id FROM property_mgmt.contractor_companies);

-- 3. Property maintenance assignments linked to COMPANY providers
DELETE FROM property_mgmt.property_maintenance_assignments
WHERE maintenance_provider_id IN (
    SELECT id FROM property_mgmt.maintenance_providers
    WHERE company_id IN (SELECT id FROM property_mgmt.contractor_companies)
);

-- 4. Maintenance providers of type COMPANY
DELETE FROM property_mgmt.maintenance_providers
WHERE company_id IN (SELECT id FROM property_mgmt.contractor_companies);

-- 5. Notifications sent to MAINTENANCE_COMPANY portal users
DELETE FROM property_mgmt.notifications
WHERE recipient_user_id IN (
    SELECT id FROM property_mgmt.users WHERE role = 'MAINTENANCE_COMPANY'
);

-- 6. Unlink employees that reference MAINTENANCE_COMPANY users
UPDATE property_mgmt.employees
SET linked_user_id = NULL
WHERE linked_user_id IN (
    SELECT id FROM property_mgmt.users WHERE role = 'MAINTENANCE_COMPANY'
);

-- 7. Portal users with MAINTENANCE_COMPANY role
DELETE FROM property_mgmt.users
WHERE role = 'MAINTENANCE_COMPANY';

-- 8. Contractor companies
DELETE FROM property_mgmt.contractor_companies;

-- 9. Reset sequence so next company starts from id = 1
ALTER SEQUENCE property_mgmt.contractor_companies_id_seq RESTART WITH 1;
