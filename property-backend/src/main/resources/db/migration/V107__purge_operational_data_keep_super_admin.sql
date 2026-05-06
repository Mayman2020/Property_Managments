-- V107: Purge properties, units, contracts, tenants, owners, and all users except SUPER_ADMIN.
-- Keeps: super admin, lookups, role_permissions, module catalog, maintenance_categories, etc.
-- Use for a clean QA / local trial (Flyway runs once per DB — re-run requires repair or new migration).
SET search_path = property_mgmt;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        -- Payroll / HR leaf
        'payslips',
        'employee_bonuses',
        'salary_advances',
        'attendance',
        'leave_requests',
        'leave_balances',
        'payroll_runs',

        -- Financial leaf
        'petty_cash',
        'owner_statements',
        'budgets',
        'financial_periods',
        'expenses',
        'other_revenues',

        -- Maintenance leaf
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

        -- Lease / tenant portal (V98 removed violations & inspections tables)
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

        -- Vacancy
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

        -- Attachments & per-property config
        'property_attachments',
        'tenant_owner_attachments',
        'property_module_settings',
        'property_maintenance_providers',
        'property_owners',

        -- Property hierarchy (leaf → root)
        'tenants',
        'units',
        'floors',
        'properties',
        'owners',

        -- HR (may reference users)
        'employees',
        'departments',

        -- Notifications & audit
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

DELETE FROM property_mgmt.users
WHERE role <> 'SUPER_ADMIN';

-- Reset operational code counters (optional clean slate for new property/unit/contract numbers)
DELETE FROM property_mgmt.code_generation_state
WHERE code_type IN (
    'PROPERTY', 'UNIT', 'MR', 'CNT', 'INV', 'OWN', 'TEN', 'EMP', 'VEN'
);

-- Ensure at least one super admin exists (password: 12345 — same BCrypt as V82)
INSERT INTO property_mgmt.users (username, email, password_hash, full_name, role, is_active)
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
