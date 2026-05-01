-- V81: Reset all test data — keeps users (SUPER_ADMIN/PROPERTY_ADMIN),
--      lookups, roles/permissions, screen settings, module catalog

SET search_path = property_mgmt;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'maintenance_contract_invoices',
    'maintenance_contracts',
    'property_maintenance_assignments',
    'maintenance_providers',
    'maintenance_requests',
    'maintenance_invoices',
    'visit_ratings',
    'visit_reports',
    'rent_receipts',
    'rent_payments',
    'contract_renewals',
    'lease_contracts',
    'violations_complaints',
    'unit_inspections',
    'property_attachments',
    'vacancy_management',
    'notifications',
    'notification_deliveries',
    'audit_logs',
    'units',
    'tenants',
    'properties',
    'contractor_companies'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'property_mgmt' AND table_name = tbl
    ) THEN
      EXECUTE format('TRUNCATE TABLE property_mgmt.%I RESTART IDENTITY CASCADE', tbl);
    END IF;
  END LOOP;
END $$;

DELETE FROM property_mgmt.users
WHERE role IN ('TENANT', 'MAINTENANCE_OFFICER');

DELETE FROM property_mgmt.code_generation_state
WHERE code_type IN ('PROPERTY', 'UNIT', 'MR', 'CNT', 'INV');
