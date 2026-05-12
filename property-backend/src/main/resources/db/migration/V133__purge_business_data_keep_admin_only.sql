-- Purge business/operational data and keep only the SUPER_ADMIN account.
-- This is intentionally destructive for local/QA reset: contracts, owners, tenants,
-- units, properties, related operational rows, and all non-admin users are removed.
-- Keeps schema, Flyway history, lookups, roles/permissions, templates, and app config data.
SET search_path = property_mgmt;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        -- Payroll / HR operational data
        'payslips',
        'employee_bonuses',
        'salary_advances',
        'attendance',
        'leave_requests',
        'leave_balances',
        'payroll_runs',

        -- Financial operational data
        'petty_cash',
        'owner_statements',
        'budgets',
        'financial_periods',
        'expenses',
        'other_revenues',

        -- Maintenance operational data
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

        -- Contracts / tenant portal
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

        -- Vacancy / rental pipeline
        'vacancy_photos',
        'rental_inquiries',
        'vacancy_listings',

        -- Inventory
        'inventory_transactions',
        'inventory_items',

        -- Vendors / contractors
        'vendor_contracts',
        'vendors',
        'contractor_companies',

        -- Attachments and property configuration
        'property_attachments',
        'tenant_owner_attachments',
        'property_module_settings',
        'property_maintenance_providers',
        'property_owners',

        -- Requested business data: tenants, units, owners and their property tree
        'tenants',
        'units',
        'floors',
        'properties',
        'owners',

        -- Staff / org rows linked to non-admin users
        'employees',
        'departments',

        -- Runtime/audit records
        'notification_deliveries',
        'notifications',
        'audit_logs',
        'contract_requests'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'property_mgmt'
              AND table_name = tbl
        ) THEN
            EXECUTE format('TRUNCATE TABLE property_mgmt.%I RESTART IDENTITY CASCADE', tbl);
        END IF;
    END LOOP;
END $$;

DELETE FROM property_mgmt.users
WHERE role <> 'SUPER_ADMIN';

DELETE FROM property_mgmt.code_generation_state
WHERE code_type IN (
    'PROPERTY', 'UNIT', 'MR', 'CNT', 'INV', 'OWN', 'TEN', 'EMP', 'VEN'
);

-- Ensure a usable admin remains even if users was truncated through FK cascade.
-- Password: 12345
INSERT INTO property_mgmt.users (username, email, password_hash, full_name, role, is_active, must_change_password)
VALUES (
    'superadmin',
    'admin@propmgmt.com',
    '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS',
    'Super Administrator',
    'SUPER_ADMIN',
    TRUE,
    FALSE
)
ON CONFLICT (email) DO UPDATE
    SET password_hash        = EXCLUDED.password_hash,
        is_active            = TRUE,
        role                 = 'SUPER_ADMIN',
        username             = EXCLUDED.username,
        full_name            = EXCLUDED.full_name,
        property_id          = NULL,
        extra_roles          = NULL,
        must_change_password = FALSE;
