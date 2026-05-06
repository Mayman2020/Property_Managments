-- V113: Operational reset — vacant units, no business data, only SUPER_ADMIN + OWNER users.
-- Keeps: lookups, role_permissions, module catalog/definitions, screen settings, contract templates,
--         notification_templates, category tables (maintenance/finance lookups), properties, floors, units,
--         owners, property_owners, property_module_settings.
-- Removes: payroll/HR, finance ops, maintenance ops, leases/tenants, inventory, vendors/contractors,
--          notifications, audit_logs, and every user whose role is not SUPER_ADMIN or OWNER.
SET search_path = property_mgmt;

-- Avoid FK failures when contractor_companies is truncated (properties/users reference company ids).
UPDATE properties SET maintenance_contractor_company_id = NULL;
UPDATE users SET contractor_company_id = NULL;

UPDATE properties SET maintenance_internal_officer_user_id = NULL
WHERE maintenance_internal_officer_user_id IN (
    SELECT id FROM users WHERE role NOT IN ('SUPER_ADMIN', 'OWNER')
);

DELETE FROM property_maintenance_providers
WHERE provider_type = 'USER'
  AND provider_id IN (SELECT id FROM users WHERE role NOT IN ('SUPER_ADMIN', 'OWNER'));

UPDATE owners SET user_id = NULL
WHERE user_id IN (SELECT id FROM users WHERE role NOT IN ('SUPER_ADMIN', 'OWNER'));

-- Same operational subtree as V107, but do not drop property tree, owner rows, property_owners, or per-property module flags.
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'payslips',
        'employee_bonuses',
        'salary_advances',
        'attendance',
        'leave_requests',
        'leave_balances',
        'payroll_runs',
        'petty_cash',
        'owner_statements',
        'budgets',
        'financial_periods',
        'expenses',
        'other_revenues',
        'maintenance_contract_invoices',
        'maintenance_contracts',
        'property_maintenance_assignments',
        'maintenance_providers',
        'maintenance_invoices',
        'vendor_ratings',
        'request_attachments',
        'visit_report_items',
        'visit_ratings',
        'visit_reports',
        'maintenance_requests',
        'contract_action_requests',
        'rent_receipts',
        'rent_payments',
        'rent_payment_schedule',
        'contract_attachments',
        'contract_clauses',
        'contract_renewals',
        'contract_notifications',
        'contract_fees',
        'lease_contracts',
        'tenant_complaints',
        'vacancy_photos',
        'rental_inquiries',
        'vacancy_listings',
        'inventory_transactions',
        'inventory_items',
        'vendor_contracts',
        'vendors',
        'contractor_companies',
        'property_attachments',
        'tenant_owner_attachments',
        'property_maintenance_providers',
        'tenants',
        'employees',
        'departments',
        'notification_deliveries',
        'notifications',
        'audit_logs',
        'contract_requests'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'property_mgmt' AND table_name = tbl
        ) THEN
            EXECUTE format(
                'TRUNCATE TABLE property_mgmt.%I RESTART IDENTITY CASCADE',
                tbl
            );
        END IF;
    END LOOP;
END $$;

DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN', 'OWNER');

DELETE FROM code_generation_state
WHERE code_type IN (
    'PROPERTY', 'UNIT', 'MR', 'CNT', 'INV', 'OWN', 'TEN', 'EMP', 'VEN'
);

UPDATE units SET is_rented = FALSE, is_reserved = FALSE;

INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES (
    'superadmin',
    'admin@propmgmt.com',
    '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS',
    'Super Administrator',
    'SUPER_ADMIN',
    TRUE
)
ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_active       = TRUE,
        role            = 'SUPER_ADMIN',
        username        = EXCLUDED.username,
        full_name       = EXCLUDED.full_name;
