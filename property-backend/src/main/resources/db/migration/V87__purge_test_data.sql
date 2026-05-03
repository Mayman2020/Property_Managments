-- V87: Purge all test/demo data
-- KEEPS: SUPER_ADMIN user, lookups, roles/permissions, screen settings, module catalog,
--        maintenance_categories, leave_types, expense_categories, revenue_categories
-- DELETES: all properties, units, tenants, maintenance requests, owners, users (non-SUPER_ADMIN),
--          HR/payroll, financial, vendors, contractors, notifications, audit logs

SET search_path = property_mgmt;

DO $$
DECLARE
    tbl TEXT;
    -- Ordered leaf-to-root to satisfy FK constraints (CASCADE handles any missed deps)
    tables TEXT[] := ARRAY[
        -- Payroll / HR leaf tables
        'payslips',
        'employee_bonuses',
        'salary_advances',
        'attendance',
        'leave_requests',
        'leave_balances',
        'payroll_runs',

        -- Financial leaf tables
        'petty_cash',
        'owner_statements',
        'budgets',
        'financial_periods',
        'expenses',
        'other_revenues',

        -- Maintenance leaf tables
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

        -- Contract / lease leaf tables
        'rent_receipts',
        'rent_payments',
        'rent_payment_schedule',
        'contract_attachments',
        'contract_clauses',
        'contract_renewals',
        'contract_notifications',
        'contract_fees',
        'violations_complaints',
        'inspection_photos',
        'unit_inspections',
        'lease_contracts',

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

        -- Attachments
        'property_attachments',
        'tenant_owner_attachments',

        -- Property hierarchy (leaf → root)
        'tenants',
        'units',
        'floors',
        'properties',
        'owners',

        -- HR structure (employees has circular FK with departments via manager_id — handled by CASCADE)
        'employees',
        'departments',

        -- Notifications and audit
        'notification_deliveries',
        'notifications',
        'audit_logs',

        -- Contract requests / receipts (if table exists)
        'contract_requests',
        'rent_receipts'
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

-- Delete all non-SUPER_ADMIN users
DELETE FROM property_mgmt.users
WHERE role != 'SUPER_ADMIN';

-- Reset code generation counters for all operational code types
DELETE FROM property_mgmt.code_generation_state
WHERE code_type IN ('PROPERTY', 'UNIT', 'MR', 'CNT', 'INV', 'OWN', 'TEN', 'EMP', 'VEN');
