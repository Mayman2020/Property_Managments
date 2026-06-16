-- V182: Full purge — remove all operational/business data.
-- Keeps: lookups, maintenance_categories, expense_categories, revenue_categories,
--        leave_types, screen_settings, module_definitions/presets,
--        role_permissions, notification_templates, contract_templates, SUPER_ADMIN user.
-- Password after purge: 12345  (admin@propmgmt.com / superadmin)

SET search_path = property_mgmt;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        -- Payroll / HR
        'payroll_deductions',
        'payslips',
        'employee_bonuses',
        'salary_advances',
        'attendance',
        'leave_requests',
        'leave_balances',
        'payroll_runs',
        'employees',
        'departments',

        -- Petty cash
        'petty_cash_transactions',
        'petty_cash_funds',

        -- Finance
        'owner_statements',
        'budgets',
        'financial_periods',
        'expenses',
        'other_revenues',

        -- Maintenance contract invoices (children first)
        'maintenance_contract_invoice_payments',
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

        -- Complaints
        'complaint_replies',
        'complaint_ratings',
        'complaint_attachments',
        'tenant_violations',
        'tenant_complaints',

        -- Contracts
        'contract_annexes',
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
        'contract_requests',

        -- Inspections
        'unit_inspection_items',
        'inspection_photos',
        'unit_inspections',

        -- Vacancies / inventory
        'vacancy_photos',
        'rental_inquiries',
        'vacancy_listings',
        'inventory_transactions',
        'inventory_items',

        -- Vendors / contractors
        'vendor_contracts',
        'vendors',
        'contractor_companies',

        -- Property tree (children before parents)
        'owner_revenue_shares',
        'property_attachments',
        'tenant_owner_attachments',
        'property_module_settings',
        'property_maintenance_providers',
        'property_owners',
        'tenants',
        'units',
        'floors',
        'properties',
        'owners',
        'legal_entities',

        -- Runtime / transient
        'notification_deliveries',
        'notifications',
        'audit_logs',
        'user_property_access'
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

-- Remove all non-admin users
DELETE FROM property_mgmt.users
WHERE role <> 'SUPER_ADMIN';

-- Reset code counters
DELETE FROM property_mgmt.code_generation_state
WHERE code_type IN (
    'PROPERTY', 'UNIT', 'MR', 'CNT', 'INV', 'OWN', 'TEN', 'EMP', 'VEN', 'MCI', 'EXP'
);

-- Ensure admin user is present and active with password 12345
INSERT INTO property_mgmt.users (
    username, email, password_hash, full_name, role, is_active, must_change_password
)
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
    SET password_hash         = EXCLUDED.password_hash,
        is_active             = TRUE,
        role                  = 'SUPER_ADMIN',
        username              = EXCLUDED.username,
        full_name             = EXCLUDED.full_name,
        property_id           = NULL,
        extra_roles           = NULL,
        contractor_company_id = NULL,
        must_change_password  = FALSE;
