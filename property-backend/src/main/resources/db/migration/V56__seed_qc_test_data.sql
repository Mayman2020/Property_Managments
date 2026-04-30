-- QC seed data for full frontend/backend validation

DO $$
DECLARE
    v_password_hash CONSTANT TEXT := '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS';
    v_owner1_id BIGINT;
    v_property1_id BIGINT;
    v_property2_id BIGINT;
    v_admin_user_id BIGINT;
    v_maintenance_user_id BIGINT;
    v_property_admin_id BIGINT;
    v_accountant_user_id BIGINT;
    v_hr_user_id BIGINT;
    v_contracts_user_id BIGINT;
    v_owner_user_id BIGINT;
    v_tenant1_user_id BIGINT;
    v_tenant2_user_id BIGINT;
    v_tenant1_id BIGINT;
    v_tenant2_id BIGINT;
    v_floor1_p1 BIGINT;
    v_floor2_p1 BIGINT;
    v_floor1_p2 BIGINT;
    v_unit101_id BIGINT;
    v_unit102_id BIGINT;
    v_unit103_id BIGINT;
    v_unit201_id BIGINT;
    v_unit202_id BIGINT;
    v_finance_dept_id BIGINT;
    v_hr_dept_id BIGINT;
    v_ops_dept_id BIGINT;
    v_emp_hr_id BIGINT;
    v_emp_acc_id BIGINT;
    v_emp_ops_id BIGINT;
    v_contract1_id BIGINT;
    v_contract2_id BIGINT;
    v_schedule_c1_mar BIGINT;
    v_schedule_c1_apr BIGINT;
    v_schedule_c1_may BIGINT;
    v_schedule_c2_apr BIGINT;
    v_schedule_c2_may BIGINT;
    v_vendor1_id BIGINT;
    v_vendor2_id BIGINT;
    v_listing1_id BIGINT;
    v_listing2_id BIGINT;
    v_period1_id BIGINT;
    v_period2_id BIGINT;
    v_payroll_run_id BIGINT;
    v_petty_fund_id BIGINT;
    v_contractor_company_id BIGINT;
BEGIN
    SELECT id INTO v_admin_user_id FROM users WHERE email = 'admin@propmgmt.com';
    SELECT id INTO v_maintenance_user_id FROM users WHERE email = 'officer1@propmgmt.com';
    SELECT id INTO v_tenant1_user_id FROM users WHERE email = 'tenant1@propmgmt.com';

    UPDATE users
    SET full_name = COALESCE(NULLIF(full_name, ''), 'مشرف النظام'),
        password_hash = v_password_hash,
        is_active = TRUE
    WHERE id = v_admin_user_id;

    UPDATE users
    SET full_name = COALESCE(NULLIF(full_name, ''), 'فني الصيانة الداخلي'),
        property_id = 1,
        password_hash = v_password_hash,
        is_active = TRUE
    WHERE id = v_maintenance_user_id;

    UPDATE users
    SET full_name = COALESCE(NULLIF(full_name, ''), 'محمد المستأجر'),
        password_hash = v_password_hash,
        is_active = TRUE
    WHERE id = v_tenant1_user_id;

    INSERT INTO users (username, email, password_hash, full_name, phone, role, property_id, is_active)
    SELECT 'propertyadmin1', 'propertyadmin1@propmgmt.com', v_password_hash, 'مدير العقار التجريبي', '0501000001', 'PROPERTY_ADMIN', 1, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'propertyadmin1@propmgmt.com');

    INSERT INTO users (username, email, password_hash, full_name, phone, role, property_id, is_active)
    SELECT 'accountant1', 'accountant1@propmgmt.com', v_password_hash, 'محاسب التشغيل', '0501000002', 'ACCOUNTANT', 1, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'accountant1@propmgmt.com');

    INSERT INTO users (username, email, password_hash, full_name, phone, role, property_id, is_active)
    SELECT 'hrofficer1', 'hrofficer1@propmgmt.com', v_password_hash, 'أخصائي الموارد البشرية', '0501000003', 'HR_OFFICER', 1, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'hrofficer1@propmgmt.com');

    INSERT INTO users (username, email, password_hash, full_name, phone, role, property_id, is_active)
    SELECT 'contractsofficer1', 'contractsofficer1@propmgmt.com', v_password_hash, 'مسؤول العقود', '0501000004', 'CONTRACTS_OFFICER', 1, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'contractsofficer1@propmgmt.com');

    INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
    SELECT 'owner1', 'owner@propmgmt.com', v_password_hash, 'بوابة المالك', '0501000005', 'OWNER', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'owner@propmgmt.com');

    INSERT INTO users (username, email, password_hash, full_name, phone, role, property_id, is_active)
    SELECT 'tenant2', 'tenant2@propmgmt.com', v_password_hash, 'سارة المستأجرة', '0501000006', 'TENANT', NULL, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tenant2@propmgmt.com');

    SELECT id INTO v_property_admin_id FROM users WHERE email = 'propertyadmin1@propmgmt.com';
    SELECT id INTO v_accountant_user_id FROM users WHERE email = 'accountant1@propmgmt.com';
    SELECT id INTO v_hr_user_id FROM users WHERE email = 'hrofficer1@propmgmt.com';
    SELECT id INTO v_contracts_user_id FROM users WHERE email = 'contractsofficer1@propmgmt.com';
    SELECT id INTO v_owner_user_id FROM users WHERE email = 'owner@propmgmt.com';
    SELECT id INTO v_tenant2_user_id FROM users WHERE email = 'tenant2@propmgmt.com';

    SELECT id INTO v_owner1_id FROM owners WHERE email = 'owner@propmgmt.com' LIMIT 1;
    UPDATE owners
    SET user_id = v_owner_user_id,
        portal_access = TRUE,
        is_active = TRUE
    WHERE id = v_owner1_id;

    INSERT INTO owners (full_name, national_id, phone, email, is_active, user_id, portal_access)
    SELECT 'شركة النخيل للاستثمار', 'OWN-002', '0504000001', 'owner2@propmgmt.com', TRUE, NULL, FALSE
    WHERE NOT EXISTS (SELECT 1 FROM owners WHERE national_id = 'OWN-002');

    SELECT id INTO v_property1_id FROM properties WHERE property_code = 'PROP-TEST-001';

    INSERT INTO contractor_companies (name, phone, email, notes, active, name_ar, name_en, contract_start, contract_end)
    SELECT 'QC Maintenance Co.', '0505000001', 'ops@qc-maint.com', 'Primary contractor for QC environment', TRUE,
           'شركة كيو سي للصيانة', 'QC Maintenance Co.', CURRENT_DATE - INTERVAL '180 day', CURRENT_DATE + INTERVAL '365 day'
    WHERE NOT EXISTS (SELECT 1 FROM contractor_companies WHERE name = 'QC Maintenance Co.');
    SELECT id INTO v_contractor_company_id FROM contractor_companies WHERE name = 'QC Maintenance Co.';

    UPDATE properties
    SET owner_id = v_owner1_id,
        maintenance_internal_officer_user_id = v_maintenance_user_id,
        maintenance_contractor_company_id = v_contractor_company_id,
        total_floors = 3,
        total_units = 3,
        property_name_ar = COALESCE(property_name_ar, property_name),
        property_name_en = COALESCE(property_name_en, 'Yasmin Residential Tower'),
        updated_at = NOW()
    WHERE id = v_property1_id;

    INSERT INTO properties (
        owner_id, property_name, property_code, property_type, address, city, country,
        total_floors, total_units, description, is_active, property_name_ar, property_name_en,
        maintenance_internal_officer_user_id, maintenance_contractor_company_id
    )
    SELECT v_owner1_id, 'مجمع النخيل الإداري', 'PROP-QC-002', 'COMMERCIAL', 'حي الأعمال، شارع الملك فهد', 'الرياض', 'Saudi Arabia',
           1, 2, 'Property used to validate module presets and partial activation', TRUE,
           'مجمع النخيل الإداري', 'Nakheel Office Complex', v_maintenance_user_id, v_contractor_company_id
    WHERE NOT EXISTS (SELECT 1 FROM properties WHERE property_code = 'PROP-QC-002');

    SELECT id INTO v_property2_id FROM properties WHERE property_code = 'PROP-QC-002';

    UPDATE users
    SET property_id = v_property2_id
    WHERE email = 'tenant2@propmgmt.com';

    INSERT INTO floors (property_id, floor_number, floor_label)
    SELECT v_property1_id, 1, 'الدور الأول'
    WHERE NOT EXISTS (SELECT 1 FROM floors WHERE property_id = v_property1_id AND floor_number = 1);
    INSERT INTO floors (property_id, floor_number, floor_label)
    SELECT v_property1_id, 2, 'الدور الثاني'
    WHERE NOT EXISTS (SELECT 1 FROM floors WHERE property_id = v_property1_id AND floor_number = 2);
    INSERT INTO floors (property_id, floor_number, floor_label)
    SELECT v_property2_id, 1, 'الدور الأرضي'
    WHERE NOT EXISTS (SELECT 1 FROM floors WHERE property_id = v_property2_id AND floor_number = 1);

    SELECT id INTO v_floor1_p1 FROM floors WHERE property_id = v_property1_id AND floor_number = 1;
    SELECT id INTO v_floor2_p1 FROM floors WHERE property_id = v_property1_id AND floor_number = 2;
    SELECT id INTO v_floor1_p2 FROM floors WHERE property_id = v_property2_id AND floor_number = 1;

    UPDATE units
    SET floor_id = COALESCE(floor_id, v_floor1_p1),
        unit_type = 'APARTMENT',
        bedrooms = COALESCE(bedrooms, 2),
        bathrooms = COALESCE(bathrooms, 2),
        area_sqm = COALESCE(area_sqm, 120),
        rent_amount = COALESCE(rent_amount, 3500),
        currency = COALESCE(currency, 'SAR'),
        is_active = TRUE,
        is_rented = TRUE
    WHERE property_id = v_property1_id AND unit_number = '101';

    INSERT INTO units (property_id, floor_id, unit_number, unit_type, area_sqm, bedrooms, bathrooms, is_rented, rent_amount, currency, notes, is_active)
    SELECT v_property1_id, v_floor1_p1, '102', 'APARTMENT', 115, 2, 2, FALSE, 3800, 'SAR', 'Vacant unit for vacancy workflow', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM units WHERE property_id = v_property1_id AND unit_number = '102');

    INSERT INTO units (property_id, floor_id, unit_number, unit_type, area_sqm, bedrooms, bathrooms, is_rented, rent_amount, currency, notes, is_active)
    SELECT v_property1_id, v_floor2_p1, '103', 'APARTMENT', 140, 3, 3, FALSE, 4300, 'SAR', 'Secondary unit for contract coverage', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM units WHERE property_id = v_property1_id AND unit_number = '103');

    INSERT INTO units (property_id, floor_id, unit_number, unit_type, area_sqm, bedrooms, bathrooms, is_rented, rent_amount, currency, notes, is_active)
    SELECT v_property2_id, v_floor1_p2, '201', 'OFFICE', 170, NULL, 2, TRUE, 5200, 'SAR', 'Occupied office unit', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM units WHERE property_id = v_property2_id AND unit_number = '201');

    INSERT INTO units (property_id, floor_id, unit_number, unit_type, area_sqm, bedrooms, bathrooms, is_rented, rent_amount, currency, notes, is_active)
    SELECT v_property2_id, v_floor1_p2, '202', 'OFFICE', 160, NULL, 2, FALSE, 4800, 'SAR', 'Vacant office for module testing', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM units WHERE property_id = v_property2_id AND unit_number = '202');

    SELECT id INTO v_unit101_id FROM units WHERE property_id = v_property1_id AND unit_number = '101';
    SELECT id INTO v_unit102_id FROM units WHERE property_id = v_property1_id AND unit_number = '102';
    SELECT id INTO v_unit103_id FROM units WHERE property_id = v_property1_id AND unit_number = '103';
    SELECT id INTO v_unit201_id FROM units WHERE property_id = v_property2_id AND unit_number = '201';
    SELECT id INTO v_unit202_id FROM units WHERE property_id = v_property2_id AND unit_number = '202';

    UPDATE tenants
    SET property_id = v_property1_id,
        unit_id = v_unit101_id,
        lease_start = DATE '2025-10-22',
        lease_end = DATE '2026-10-22',
        is_active = TRUE
    WHERE email = 'tenant1@propmgmt.com';
    SELECT id INTO v_tenant1_id FROM tenants WHERE email = 'tenant1@propmgmt.com';

    INSERT INTO tenants (user_id, unit_id, property_id, full_name, national_id, phone, email, lease_start, lease_end, is_active, notes)
    SELECT v_tenant2_user_id, v_unit201_id, v_property2_id, 'سارة المستأجرة', 'TEN-002', '0506000001', 'tenant2@propmgmt.com',
           DATE '2025-06-01', DATE '2026-05-23', TRUE, 'Tenant seeded for contract and owner portal testing'
    WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE email = 'tenant2@propmgmt.com');
    SELECT id INTO v_tenant2_id FROM tenants WHERE email = 'tenant2@propmgmt.com';

    INSERT INTO departments (property_id, dept_name_ar, dept_name_en, is_active)
    SELECT v_property1_id, 'الإدارة المالية', 'Finance', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE property_id = v_property1_id AND dept_name_en = 'Finance');
    INSERT INTO departments (property_id, dept_name_ar, dept_name_en, is_active)
    SELECT v_property1_id, 'الموارد البشرية', 'HR', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE property_id = v_property1_id AND dept_name_en = 'HR');
    INSERT INTO departments (property_id, dept_name_ar, dept_name_en, is_active)
    SELECT v_property1_id, 'العمليات', 'Operations', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE property_id = v_property1_id AND dept_name_en = 'Operations');

    SELECT id INTO v_finance_dept_id FROM departments WHERE property_id = v_property1_id AND dept_name_en = 'Finance';
    SELECT id INTO v_hr_dept_id FROM departments WHERE property_id = v_property1_id AND dept_name_en = 'HR';
    SELECT id INTO v_ops_dept_id FROM departments WHERE property_id = v_property1_id AND dept_name_en = 'Operations';

    INSERT INTO employees (
        employee_code, full_name, national_id, nationality, date_of_birth, gender, phone, email, address,
        department_id, property_id, job_title_ar, job_title_en, employment_type, hire_date,
        basic_salary, housing_allowance, transport_allowance, other_allowances, currency, salary_day,
        bank_name, bank_iban, status, linked_user_id, notes
    )
    SELECT 'EMP-00001', 'أخصائي الموارد البشرية', 'EMP-NID-001', 'Saudi', DATE '1990-01-15', 'FEMALE', '0507000001', 'hrofficer1@propmgmt.com', 'الرياض',
           v_hr_dept_id, v_property1_id, 'أخصائي موارد بشرية', 'HR Specialist', 'FULL_TIME', DATE '2024-01-10',
           6500, 1200, 600, 300, 'SAR', 25, 'Riyad Bank', 'SA0300000000000000000001', 'ACTIVE', v_hr_user_id, 'Seeded HR employee'
    WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP-00001');

    INSERT INTO employees (
        employee_code, full_name, national_id, nationality, date_of_birth, gender, phone, email, address,
        department_id, property_id, job_title_ar, job_title_en, employment_type, hire_date,
        basic_salary, housing_allowance, transport_allowance, other_allowances, currency, salary_day,
        bank_name, bank_iban, status, linked_user_id, notes
    )
    SELECT 'EMP-00002', 'محاسب التشغيل', 'EMP-NID-002', 'Saudi', DATE '1988-07-05', 'MALE', '0507000002', 'accountant1@propmgmt.com', 'الرياض',
           v_finance_dept_id, v_property1_id, 'محاسب', 'Accountant', 'FULL_TIME', DATE '2023-11-01',
           7200, 1500, 700, 400, 'SAR', 25, 'Al Rajhi', 'SA0300000000000000000002', 'ACTIVE', v_accountant_user_id, 'Seeded accountant employee'
    WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP-00002');

    INSERT INTO employees (
        employee_code, full_name, national_id, nationality, date_of_birth, gender, phone, email, address,
        department_id, property_id, job_title_ar, job_title_en, employment_type, hire_date,
        basic_salary, housing_allowance, transport_allowance, other_allowances, currency, salary_day,
        bank_name, bank_iban, status, notes
    )
    SELECT 'EMP-00003', 'مشرف عمليات المبنى', 'EMP-NID-003', 'Egypt', DATE '1985-03-20', 'MALE', '0507000003', 'ops.supervisor@propmgmt.com', 'الرياض',
           v_ops_dept_id, v_property1_id, 'مشرف عمليات', 'Operations Supervisor', 'FULL_TIME', DATE '2024-02-14',
           5600, 1000, 500, 250, 'SAR', 25, 'SNB', 'SA0300000000000000000003', 'ACTIVE', 'Seeded operations employee'
    WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'EMP-00003');

    SELECT id INTO v_emp_hr_id FROM employees WHERE employee_code = 'EMP-00001';
    SELECT id INTO v_emp_acc_id FROM employees WHERE employee_code = 'EMP-00002';
    SELECT id INTO v_emp_ops_id FROM employees WHERE employee_code = 'EMP-00003';

    UPDATE departments SET manager_id = v_emp_acc_id WHERE id = v_finance_dept_id;
    UPDATE departments SET manager_id = v_emp_hr_id WHERE id = v_hr_dept_id;
    UPDATE departments SET manager_id = v_emp_ops_id WHERE id = v_ops_dept_id;

    INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days)
    SELECT v_emp_hr_id, 1, 2026, 21, 5
    WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = v_emp_hr_id AND leave_type_id = 1 AND year = 2026);

    INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days)
    SELECT v_emp_ops_id, 1, 2026, 21, 2
    WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = v_emp_ops_id AND leave_type_id = 1 AND year = 2026);

    INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_count, reason, status)
    SELECT v_emp_ops_id, 3, CURRENT_DATE + 5, CURRENT_DATE + 6, 2, 'ظرف عائلي عاجل', 'PENDING'
    WHERE NOT EXISTS (
        SELECT 1 FROM leave_requests
        WHERE employee_id = v_emp_ops_id
          AND leave_type_id = 3
          AND start_date = CURRENT_DATE + 5
    );

    INSERT INTO vendors (vendor_code, vendor_name, vendor_type, contact_person, phone, email, address, commercial_reg, vat_number, bank_name, bank_iban, rating, total_jobs, is_active, notes)
    SELECT 'VND-00001', 'مصاعد الخبراء', 'ELEVATOR', 'محمد السبيعي', '0508000001', 'elevator@vendors.test', 'الرياض', 'CR-1001', 'VAT-1001', 'Riyad Bank', 'SA0300000000000000001001', 4.6, 14, TRUE, 'Preferred elevator maintenance vendor'
    WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE vendor_code = 'VND-00001');

    INSERT INTO vendors (vendor_code, vendor_name, vendor_type, contact_person, phone, email, address, commercial_reg, vat_number, bank_name, bank_iban, rating, total_jobs, is_active, notes)
    SELECT 'VND-00002', 'كلين برو للخدمات', 'CLEANER', 'أحمد الجهني', '0508000002', 'clean@vendors.test', 'الرياض', 'CR-1002', 'VAT-1002', 'Alinma', 'SA0300000000000000001002', 4.2, 22, TRUE, 'External cleaning vendor'
    WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE vendor_code = 'VND-00002');

    SELECT id INTO v_vendor1_id FROM vendors WHERE vendor_code = 'VND-00001';
    SELECT id INTO v_vendor2_id FROM vendors WHERE vendor_code = 'VND-00002';

    INSERT INTO vendor_contracts (vendor_id, property_id, contract_type, description, start_date, end_date, monthly_value, total_value, currency, status, contract_doc_url)
    SELECT v_vendor1_id, v_property1_id, 'ANNUAL_MAINTENANCE', 'Annual service contract for elevators', CURRENT_DATE - 90, CURRENT_DATE + 275, 1500, 18000, 'SAR', 'ACTIVE', NULL
    WHERE v_vendor1_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM vendor_contracts
          WHERE vendor_id = v_vendor1_id AND property_id = v_property1_id AND contract_type = 'ANNUAL_MAINTENANCE'
      );

    UPDATE maintenance_requests
    SET tenant_id = v_tenant1_id,
        property_id = v_property1_id,
        unit_id = v_unit101_id,
        category_id = 1,
        title = 'تسريب في مطبخ الوحدة 101',
        description = 'يوجد تسريب مستمر أسفل الحوض يحتاج متابعة عاجلة',
        priority = 'HIGH',
        status = 'SCHEDULED',
        assigned_to = v_maintenance_user_id,
        scheduled_date = CURRENT_DATE + 1,
        scheduled_time_from = TIME '10:00',
        scheduled_time_to = TIME '12:00',
        tenant_notes = 'الرجاء الاتصال قبل الزيارة',
        contractor_company_id = v_contractor_company_id,
        updated_at = NOW()
    WHERE id = 1;

    INSERT INTO maintenance_requests (
        request_number, tenant_id, unit_id, property_id, category_id, title, description, priority, status,
        assigned_to, scheduled_date, scheduled_time_from, scheduled_time_to, tenant_notes, contractor_company_id
    )
    SELECT 'MR-2026-00002', v_tenant1_id, v_unit101_id, v_property1_id, 2, 'انقطاع في إنارة الممر', 'المصباح في الممر الخارجي لا يعمل', 'NORMAL', 'IN_PROGRESS',
           v_maintenance_user_id, CURRENT_DATE, TIME '09:00', TIME '11:00', 'تمت الزيارة الأولى', v_contractor_company_id
    WHERE NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE request_number = 'MR-2026-00002');

    INSERT INTO maintenance_requests (
        request_number, tenant_id, unit_id, property_id, category_id, title, description, priority, status,
        assigned_to, scheduled_date, scheduled_time_from, scheduled_time_to, tenant_notes, contractor_company_id, closed_at
    )
    SELECT 'MR-2026-00003', v_tenant2_id, v_unit201_id, v_property2_id, 3, 'تبريد ضعيف بالمكتب', 'المكيف لا يبرد بشكل كاف', 'URGENT', 'COMPLETED',
           v_maintenance_user_id, CURRENT_DATE - 3, TIME '13:00', TIME '15:00', 'تم الإنجاز بنجاح', v_contractor_company_id, NOW() - INTERVAL '2 day'
    WHERE NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE request_number = 'MR-2026-00003');

    INSERT INTO inventory_items (property_id, item_code, item_name_ar, item_name_en, unit_of_measure, quantity, min_quantity, location, is_active)
    SELECT v_property1_id, 'INV-CLN-001', 'منظف متعدد الاستخدام', 'Multi-purpose Cleaner', 'BOTTLE', 15, 5, 'المستودع الرئيسي', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE item_code = 'INV-CLN-001');

    INSERT INTO inventory_items (property_id, item_code, item_name_ar, item_name_en, unit_of_measure, quantity, min_quantity, location, is_active)
    SELECT v_property1_id, 'INV-ELE-002', 'لمبات ليد', 'LED Bulbs', 'PCS', 3, 10, 'رف الكهرباء', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE item_code = 'INV-ELE-002');

    INSERT INTO inventory_transactions (request_id, item_id, transaction_type, quantity, notes, performed_by)
    SELECT 1, ii.id, 'OUT', 2, 'Used for scheduled plumbing visit', v_maintenance_user_id
    FROM inventory_items ii
    WHERE ii.item_code = 'INV-CLN-001'
      AND NOT EXISTS (
          SELECT 1 FROM inventory_transactions it
          WHERE it.request_id = 1 AND it.item_id = ii.id AND it.transaction_type = 'OUT'
      );

    INSERT INTO inventory_transactions (request_id, item_id, transaction_type, quantity, notes, performed_by)
    SELECT NULL, ii.id, 'IN', 20, 'Quarterly stock refill', v_admin_user_id
    FROM inventory_items ii
    WHERE ii.item_code = 'INV-ELE-002'
      AND NOT EXISTS (
          SELECT 1 FROM inventory_transactions it
          WHERE it.item_id = ii.id AND it.transaction_type = 'IN' AND it.quantity = 20
      );

    INSERT INTO lease_contracts (
        contract_number, tenant_id, unit_id, property_id, owner_id, start_date, end_date, signing_date,
        monthly_rent, security_deposit, payment_frequency, payment_day, currency, status,
        is_auto_renewable, renewal_notice_days, created_by, approved_by, notes
    )
    SELECT 'CNT-2026-00001', v_tenant1_id, v_unit101_id, v_property1_id, v_owner1_id, DATE '2025-10-22', DATE '2026-10-22', DATE '2025-10-20',
           3500, 3500, 'MONTHLY', 1, 'SAR', 'ACTIVE', TRUE, 30, v_property_admin_id, v_contracts_user_id, 'Primary residential contract'
    WHERE NOT EXISTS (SELECT 1 FROM lease_contracts WHERE contract_number = 'CNT-2026-00001');

    INSERT INTO lease_contracts (
        contract_number, tenant_id, unit_id, property_id, owner_id, start_date, end_date, signing_date,
        monthly_rent, security_deposit, payment_frequency, payment_day, currency, status,
        is_auto_renewable, renewal_notice_days, created_by, approved_by, notes
    )
    SELECT 'CNT-2026-00002', v_tenant2_id, v_unit201_id, v_property2_id, v_owner1_id, DATE '2025-06-01', DATE '2026-05-23', DATE '2025-05-28',
           5200, 5000, 'MONTHLY', 5, 'SAR', 'ACTIVE', FALSE, 30, v_property_admin_id, v_contracts_user_id, 'Expiring office contract'
    WHERE NOT EXISTS (SELECT 1 FROM lease_contracts WHERE contract_number = 'CNT-2026-00002');

    SELECT id INTO v_contract1_id FROM lease_contracts WHERE contract_number = 'CNT-2026-00001';
    SELECT id INTO v_contract2_id FROM lease_contracts WHERE contract_number = 'CNT-2026-00002';

    UPDATE units SET is_rented = TRUE WHERE id IN (v_unit101_id, v_unit201_id);
    UPDATE units SET is_rented = FALSE WHERE id IN (v_unit102_id, v_unit103_id, v_unit202_id);

    INSERT INTO rent_payment_schedule (contract_id, due_date, amount, period_from, period_to, status)
    SELECT v_contract1_id, DATE '2026-03-01', 3500, DATE '2026-03-01', DATE '2026-03-31', 'PAID'
    WHERE NOT EXISTS (SELECT 1 FROM rent_payment_schedule WHERE contract_id = v_contract1_id AND due_date = DATE '2026-03-01');
    INSERT INTO rent_payment_schedule (contract_id, due_date, amount, period_from, period_to, status)
    SELECT v_contract1_id, DATE '2026-04-01', 3500, DATE '2026-04-01', DATE '2026-04-30', 'OVERDUE'
    WHERE NOT EXISTS (SELECT 1 FROM rent_payment_schedule WHERE contract_id = v_contract1_id AND due_date = DATE '2026-04-01');
    INSERT INTO rent_payment_schedule (contract_id, due_date, amount, period_from, period_to, status)
    SELECT v_contract1_id, DATE '2026-05-01', 3500, DATE '2026-05-01', DATE '2026-05-31', 'PENDING'
    WHERE NOT EXISTS (SELECT 1 FROM rent_payment_schedule WHERE contract_id = v_contract1_id AND due_date = DATE '2026-05-01');

    INSERT INTO rent_payment_schedule (contract_id, due_date, amount, period_from, period_to, status)
    SELECT v_contract2_id, DATE '2026-04-05', 5200, DATE '2026-04-01', DATE '2026-04-30', 'PAID'
    WHERE NOT EXISTS (SELECT 1 FROM rent_payment_schedule WHERE contract_id = v_contract2_id AND due_date = DATE '2026-04-05');
    INSERT INTO rent_payment_schedule (contract_id, due_date, amount, period_from, period_to, status)
    SELECT v_contract2_id, DATE '2026-05-05', 5200, DATE '2026-05-01', DATE '2026-05-31', 'PENDING'
    WHERE NOT EXISTS (SELECT 1 FROM rent_payment_schedule WHERE contract_id = v_contract2_id AND due_date = DATE '2026-05-05');

    SELECT id INTO v_schedule_c1_mar FROM rent_payment_schedule WHERE contract_id = v_contract1_id AND due_date = DATE '2026-03-01';
    SELECT id INTO v_schedule_c1_apr FROM rent_payment_schedule WHERE contract_id = v_contract1_id AND due_date = DATE '2026-04-01';
    SELECT id INTO v_schedule_c1_may FROM rent_payment_schedule WHERE contract_id = v_contract1_id AND due_date = DATE '2026-05-01';
    SELECT id INTO v_schedule_c2_apr FROM rent_payment_schedule WHERE contract_id = v_contract2_id AND due_date = DATE '2026-04-05';
    SELECT id INTO v_schedule_c2_may FROM rent_payment_schedule WHERE contract_id = v_contract2_id AND due_date = DATE '2026-05-05';

    INSERT INTO rent_payments (schedule_id, contract_id, tenant_id, payment_date, amount_paid, amount_due, payment_method, reference_number, late_fee, discount, notes, recorded_by)
    SELECT v_schedule_c1_mar, v_contract1_id, v_tenant1_id, DATE '2026-03-02', 3500, 3500, 'BANK_TRANSFER', 'RP-202603-101', 0, 0, 'Paid in full', v_accountant_user_id
    WHERE NOT EXISTS (SELECT 1 FROM rent_payments WHERE schedule_id = v_schedule_c1_mar);

    INSERT INTO rent_payments (schedule_id, contract_id, tenant_id, payment_date, amount_paid, amount_due, payment_method, reference_number, late_fee, discount, notes, recorded_by)
    SELECT v_schedule_c2_apr, v_contract2_id, v_tenant2_id, DATE '2026-04-05', 5200, 5200, 'BANK_TRANSFER', 'RP-202604-201', 0, 0, 'April office rent', v_accountant_user_id
    WHERE NOT EXISTS (SELECT 1 FROM rent_payments WHERE schedule_id = v_schedule_c2_apr);

    INSERT INTO tenant_complaints (tenant_id, unit_id, property_id, complaint_type, title, description, status, priority, assigned_to, attachment_url)
    SELECT v_tenant1_id, v_unit101_id, v_property1_id, 'COMMON_AREA', 'مشكلة نظافة بالممر', 'الممر الخارجي يحتاج تنظيف متكرر', 'IN_REVIEW', 'NORMAL', v_contracts_user_id, NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM tenant_complaints
        WHERE tenant_id = v_tenant1_id AND title = 'مشكلة نظافة بالممر'
    );

    INSERT INTO tenant_violations (contract_id, tenant_id, unit_id, violation_type, description, severity, status, fine_amount, fine_paid, reported_by, notes)
    SELECT v_contract1_id, v_tenant1_id, v_unit101_id, 'LATE_PAYMENT', 'تأخر في سداد دفعة أبريل', 'MEDIUM', 'NOTIFIED', 250, FALSE, v_contracts_user_id, 'Late fee pending collection'
    WHERE NOT EXISTS (
        SELECT 1 FROM tenant_violations
        WHERE contract_id = v_contract1_id AND violation_type = 'LATE_PAYMENT'
    );

    INSERT INTO financial_periods (property_id, period_name, period_type, start_date, end_date, status)
    SELECT v_property1_id, 'FY-2026', 'ANNUAL', DATE '2026-01-01', DATE '2026-12-31', 'OPEN'
    WHERE NOT EXISTS (SELECT 1 FROM financial_periods WHERE property_id = v_property1_id AND period_name = 'FY-2026');
    INSERT INTO financial_periods (property_id, period_name, period_type, start_date, end_date, status)
    SELECT v_property2_id, 'FY-2026', 'ANNUAL', DATE '2026-01-01', DATE '2026-12-31', 'OPEN'
    WHERE NOT EXISTS (SELECT 1 FROM financial_periods WHERE property_id = v_property2_id AND period_name = 'FY-2026');

    SELECT id INTO v_period1_id FROM financial_periods WHERE property_id = v_property1_id AND period_name = 'FY-2026';
    SELECT id INTO v_period2_id FROM financial_periods WHERE property_id = v_property2_id AND period_name = 'FY-2026';

    INSERT INTO budgets (property_id, financial_period_id, category_id, budgeted_amount, notes)
    SELECT v_property1_id, v_period1_id, ec.id, 120000, 'Annual payroll budget'
    FROM expense_categories ec
    WHERE ec.category_code = 'PAY-SALARY'
      AND NOT EXISTS (SELECT 1 FROM budgets WHERE property_id = v_property1_id AND financial_period_id = v_period1_id AND category_id = ec.id);

    INSERT INTO budgets (property_id, financial_period_id, category_id, budgeted_amount, notes)
    SELECT v_property1_id, v_period1_id, ec.id, 24000, 'Annual common electricity budget'
    FROM expense_categories ec
    WHERE ec.category_code = 'UTIL-ELEC'
      AND NOT EXISTS (SELECT 1 FROM budgets WHERE property_id = v_property1_id AND financial_period_id = v_period1_id AND category_id = ec.id);

    INSERT INTO budgets (property_id, financial_period_id, category_id, budgeted_amount, notes)
    SELECT v_property1_id, v_period1_id, ec.id, 36000, 'Annual maintenance labor budget'
    FROM expense_categories ec
    WHERE ec.category_code = 'MAINT-LABOR'
      AND NOT EXISTS (SELECT 1 FROM budgets WHERE property_id = v_property1_id AND financial_period_id = v_period1_id AND category_id = ec.id);

    INSERT INTO payroll_runs (property_id, pay_period_year, pay_period_month, pay_date, status, total_basic, total_allowances, total_deductions, total_bonuses, total_net, notes, prepared_by, approved_by)
    SELECT v_property1_id, 2026, 3, DATE '2026-03-25', 'PAID', 19300, 6450, 1350, 500, 24900, 'Seed payroll for QC review', v_hr_user_id, v_accountant_user_id
    WHERE NOT EXISTS (SELECT 1 FROM payroll_runs WHERE property_id = v_property1_id AND pay_period_year = 2026 AND pay_period_month = 3);

    SELECT id INTO v_payroll_run_id FROM payroll_runs WHERE property_id = v_property1_id AND pay_period_year = 2026 AND pay_period_month = 3;

    INSERT INTO payslips (
        payroll_run_id, employee_id, basic_salary, housing_allowance, transport_allowance, other_allowances,
        overtime_amount, bonus_amount, total_earnings, absence_deduction, late_deduction, advance_deduction,
        penalty_deduction, insurance_deduction, other_deductions, total_deductions, net_salary,
        is_paid, paid_date, payment_method, reference_number, notes
    )
    SELECT v_payroll_run_id, v_emp_hr_id, 6500, 1200, 600, 300, 0, 0, 8600, 0, 0, 0, 0, 150, 0, 150, 8450, TRUE, DATE '2026-03-25', 'BANK_TRANSFER', 'PAY-202603-HR', 'Paid successfully'
    WHERE NOT EXISTS (SELECT 1 FROM payslips WHERE payroll_run_id = v_payroll_run_id AND employee_id = v_emp_hr_id);

    INSERT INTO payslips (
        payroll_run_id, employee_id, basic_salary, housing_allowance, transport_allowance, other_allowances,
        overtime_amount, bonus_amount, total_earnings, absence_deduction, late_deduction, advance_deduction,
        penalty_deduction, insurance_deduction, other_deductions, total_deductions, net_salary,
        is_paid, paid_date, payment_method, reference_number, notes
    )
    SELECT v_payroll_run_id, v_emp_acc_id, 7200, 1500, 700, 400, 0, 500, 10300, 0, 0, 0, 0, 200, 0, 200, 10100, TRUE, DATE '2026-03-25', 'BANK_TRANSFER', 'PAY-202603-ACC', 'Includes performance bonus'
    WHERE NOT EXISTS (SELECT 1 FROM payslips WHERE payroll_run_id = v_payroll_run_id AND employee_id = v_emp_acc_id);

    INSERT INTO payslips (
        payroll_run_id, employee_id, basic_salary, housing_allowance, transport_allowance, other_allowances,
        overtime_amount, bonus_amount, total_earnings, absence_deduction, late_deduction, advance_deduction,
        penalty_deduction, insurance_deduction, other_deductions, total_deductions, net_salary,
        is_paid, paid_date, payment_method, reference_number, notes
    )
    SELECT v_payroll_run_id, v_emp_ops_id, 5600, 1000, 500, 250, 0, 0, 7350, 0, 0, 400, 300, 200, 100, 1000, 6350, TRUE, DATE '2026-03-25', 'BANK_TRANSFER', 'PAY-202603-OPS', 'Advance deduction and operational penalty'
    WHERE NOT EXISTS (SELECT 1 FROM payslips WHERE payroll_run_id = v_payroll_run_id AND employee_id = v_emp_ops_id);

    INSERT INTO employee_bonuses (employee_id, payroll_run_id, bonus_type, amount, reason, approved_by)
    SELECT v_emp_acc_id, v_payroll_run_id, 'PERFORMANCE', 500, 'Strong month-end close', v_accountant_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM employee_bonuses
        WHERE employee_id = v_emp_acc_id AND payroll_run_id = v_payroll_run_id AND bonus_type = 'PERFORMANCE'
    );

    INSERT INTO salary_advances (employee_id, amount, request_date, approved_date, reason, status, deducted_month, deducted_year, approved_by, notes)
    SELECT v_emp_ops_id, 400, DATE '2026-04-10', DATE '2026-04-10', 'Emergency family expense', 'APPROVED', 4, 2026, v_hr_user_id, 'To be deducted when April payroll is generated'
    WHERE NOT EXISTS (
        SELECT 1 FROM salary_advances
        WHERE employee_id = v_emp_ops_id AND deducted_month = 4 AND deducted_year = 2026
    );

    INSERT INTO expenses (
        expense_number, property_id, category_id, vendor_id, description, amount, currency, expense_date,
        payment_method, reference_number, invoice_number, status, submitted_by, approved_by, approved_at, notes
    )
    SELECT 'EXP-2026-00001', v_property1_id, ec.id, NULL, 'فاتورة كهرباء المناطق المشتركة - أبريل', 2300, 'SAR', DATE '2026-04-15',
           'BANK_TRANSFER', 'UTIL-APR-001', 'INV-UTIL-APR-001', 'PAID', v_accountant_user_id, v_property_admin_id, NOW() - INTERVAL '10 day', 'Common area electricity'
    FROM expense_categories ec
    WHERE ec.category_code = 'UTIL-ELEC'
      AND NOT EXISTS (SELECT 1 FROM expenses WHERE expense_number = 'EXP-2026-00001');

    INSERT INTO expenses (
        expense_number, property_id, category_id, vendor_id, description, amount, currency, expense_date,
        payment_method, reference_number, invoice_number, status, submitted_by, approved_by, approved_at, notes
    )
    SELECT 'EXP-2026-00002', v_property1_id, ec.id, v_vendor1_id, 'صيانة مصعد المبنى', 1500, 'SAR', DATE '2026-04-20',
           'BANK_TRANSFER', 'MNT-APR-001', 'INV-MNT-APR-001', 'PAID', v_accountant_user_id, v_property_admin_id, NOW() - INTERVAL '7 day', 'Elevator maintenance charge'
    FROM expense_categories ec
    WHERE ec.category_code = 'MAINT-LABOR'
      AND NOT EXISTS (SELECT 1 FROM expenses WHERE expense_number = 'EXP-2026-00002');

    INSERT INTO expenses (
        expense_number, property_id, category_id, vendor_id, description, amount, currency, expense_date,
        payment_method, reference_number, invoice_number, status, submitted_by, notes
    )
    SELECT 'EXP-2026-00003', v_property1_id, ec.id, NULL, 'مستلزمات مكتبية للإدارة', 450, 'SAR', DATE '2026-04-21',
           'CASH', 'ADM-APR-001', 'INV-ADM-APR-001', 'PENDING', v_accountant_user_id, 'Pending approval'
    FROM expense_categories ec
    WHERE ec.category_code = 'ADMIN-OFFICE'
      AND NOT EXISTS (SELECT 1 FROM expenses WHERE expense_number = 'EXP-2026-00003');

    INSERT INTO expenses (
        expense_number, property_id, category_id, vendor_id, description, amount, currency, expense_date,
        payment_method, reference_number, invoice_number, status, submitted_by, approved_by, approved_at, notes
    )
    SELECT 'EXP-2026-00004', v_property2_id, ec.id, NULL, 'فاتورة مياه المجمع الإداري', 800, 'SAR', DATE '2026-04-18',
           'BANK_TRANSFER', 'UTIL-WTR-002', 'INV-WTR-APR-002', 'PAID', v_accountant_user_id, v_property_admin_id, NOW() - INTERVAL '8 day', 'Property 2 water invoice'
    FROM expense_categories ec
    WHERE ec.category_code = 'UTIL-WATER'
      AND NOT EXISTS (SELECT 1 FROM expenses WHERE expense_number = 'EXP-2026-00004');

    INSERT INTO expenses (
        expense_number, property_id, category_id, vendor_id, description, amount, currency, expense_date,
        payment_method, reference_number, invoice_number, status, submitted_by, approved_by, approved_at, payroll_run_id, notes
    )
    SELECT 'EXP-PAYROLL-202603', v_property1_id, ec.id, NULL, 'مسير رواتب مارس 2026', 24900, 'SAR', DATE '2026-03-25',
           'BANK_TRANSFER', 'PAYROLL-202603', 'PAYROLL-202603', 'PAID', v_accountant_user_id, v_property_admin_id, NOW() - INTERVAL '34 day', v_payroll_run_id, 'Seed payroll expense snapshot'
    FROM expense_categories ec
    WHERE ec.category_code = 'PAY-SALARY'
      AND NOT EXISTS (SELECT 1 FROM expenses WHERE expense_number = 'EXP-PAYROLL-202603');

    INSERT INTO other_revenues (
        revenue_number, property_id, category_id, tenant_id, contract_id, description, amount, currency,
        revenue_date, payment_method, reference_number, notes, recorded_by
    )
    SELECT 'REV-2026-00001', v_property1_id, rc.id, v_tenant1_id, v_contract1_id, 'تأمين مسترد للوحدة 101', 3500, 'SAR',
           DATE '2026-04-12', 'BANK_TRANSFER', 'REV-DEP-001', 'Security deposit collection', v_accountant_user_id
    FROM revenue_categories rc
    WHERE rc.category_code = 'REV-DEPOSIT'
      AND NOT EXISTS (SELECT 1 FROM other_revenues WHERE revenue_number = 'REV-2026-00001');

    INSERT INTO other_revenues (
        revenue_number, property_id, category_id, tenant_id, contract_id, description, amount, currency,
        revenue_date, payment_method, reference_number, notes, recorded_by
    )
    SELECT 'REV-2026-00002', v_property2_id, rc.id, v_tenant2_id, v_contract2_id, 'رسوم خدمات مكتب 201', 600, 'SAR',
           DATE '2026-04-19', 'BANK_TRANSFER', 'REV-SRV-001', 'Service fee for office tenant', v_accountant_user_id
    FROM revenue_categories rc
    WHERE rc.category_code = 'REV-SERVICE'
      AND NOT EXISTS (SELECT 1 FROM other_revenues WHERE revenue_number = 'REV-2026-00002');

    INSERT INTO petty_cash_funds (property_id, fund_name, custodian_id, opening_balance, current_balance, max_transaction, is_active)
    SELECT v_property1_id, 'عهدة النثريات الرئيسية', v_emp_ops_id, 5000, 5320, 500, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM petty_cash_funds WHERE property_id = v_property1_id AND fund_name = 'عهدة النثريات الرئيسية');
    SELECT id INTO v_petty_fund_id FROM petty_cash_funds WHERE property_id = v_property1_id AND fund_name = 'عهدة النثريات الرئيسية';

    INSERT INTO petty_cash_transactions (fund_id, transaction_type, amount, description, category_id, balance_after, performed_by, approved_by, transaction_date)
    SELECT v_petty_fund_id, 'OUT', 180, 'شراء مستلزمات تنظيف عاجلة', ec.id, 4820, v_emp_ops_id, v_accountant_user_id, DATE '2026-04-09'
    FROM expense_categories ec
    WHERE ec.category_code = 'CLEAN-SUPPLY'
      AND NOT EXISTS (
          SELECT 1 FROM petty_cash_transactions
          WHERE fund_id = v_petty_fund_id AND transaction_type = 'OUT' AND amount = 180 AND transaction_date = DATE '2026-04-09'
      );

    INSERT INTO petty_cash_transactions (fund_id, transaction_type, amount, description, category_id, balance_after, performed_by, approved_by, transaction_date)
    SELECT v_petty_fund_id, 'IN', 500, 'تغذية إضافية للعهدة', NULL, 5320, v_emp_ops_id, v_accountant_user_id, DATE '2026-04-22'
    WHERE NOT EXISTS (
        SELECT 1 FROM petty_cash_transactions
        WHERE fund_id = v_petty_fund_id AND transaction_type = 'IN' AND amount = 500 AND transaction_date = DATE '2026-04-22'
    );

    INSERT INTO vacancy_listings (unit_id, property_id, title_ar, title_en, description_ar, asking_rent, currency, available_from, is_published, published_at, views_count, created_by)
    SELECT v_unit102_id, v_property1_id, 'شقة جاهزة للإيجار - 102', 'Apartment 102 Ready for Lease',
           'وحدة مجددة بالكامل مع مطبخ حديث وبلكونة', 3800, 'SAR', DATE '2026-05-10', TRUE, NOW() - INTERVAL '5 day', 37, v_contracts_user_id
    WHERE NOT EXISTS (SELECT 1 FROM vacancy_listings WHERE unit_id = v_unit102_id);

    INSERT INTO vacancy_listings (unit_id, property_id, title_ar, title_en, description_ar, asking_rent, currency, available_from, is_published, published_at, views_count, created_by)
    SELECT v_unit202_id, v_property2_id, 'مكتب إداري 202', 'Office 202 Available',
           'مساحة مناسبة للشركات الصغيرة والمتوسطة', 4800, 'SAR', DATE '2026-05-15', FALSE, NULL, 8, v_contracts_user_id
    WHERE NOT EXISTS (SELECT 1 FROM vacancy_listings WHERE unit_id = v_unit202_id);

    SELECT id INTO v_listing1_id FROM vacancy_listings WHERE unit_id = v_unit102_id;
    SELECT id INTO v_listing2_id FROM vacancy_listings WHERE unit_id = v_unit202_id;

    INSERT INTO vacancy_photos (listing_id, photo_url, is_cover, display_order)
    SELECT v_listing1_id, '/files/demo/vacancy-102-cover.jpg', TRUE, 1
    WHERE NOT EXISTS (SELECT 1 FROM vacancy_photos WHERE listing_id = v_listing1_id AND display_order = 1);

    INSERT INTO rental_inquiries (listing_id, unit_id, property_id, inquirer_name, inquirer_phone, inquirer_email, inquirer_type, message, preferred_start, status, assigned_to, notes)
    SELECT v_listing1_id, v_unit102_id, v_property1_id, 'خالد المقبل', '0509000001', 'khaled@example.com', 'INDIVIDUAL',
           'أرغب بمعاينة الوحدة هذا الأسبوع', DATE '2026-05-12', 'CONTACTED', v_contracts_user_id, 'Needs follow-up call'
    WHERE NOT EXISTS (
        SELECT 1 FROM rental_inquiries WHERE listing_id = v_listing1_id AND inquirer_phone = '0509000001'
    );

    INSERT INTO owner_statements (
        owner_id, property_id, statement_month, statement_year, total_rent_collected, total_other_revenue, total_revenue,
        total_maintenance, total_payroll, total_utilities, total_admin, total_expenses, net_income,
        management_fee_pct, management_fee_amount, owner_net_amount, status, pdf_url, notes
    )
    SELECT v_owner1_id, v_property1_id, 3, 2026, 3500, 0, 3500, 1500, 24900, 0, 0, 26400, -22900,
           8, 280, -23180, 'CONFIRMED', '/files/demo/owner-statement-2026-03.pdf', 'March statement'
    WHERE NOT EXISTS (
        SELECT 1 FROM owner_statements WHERE owner_id = v_owner1_id AND property_id = v_property1_id AND statement_year = 2026 AND statement_month = 3
    );

    INSERT INTO owner_statements (
        owner_id, property_id, statement_month, statement_year, total_rent_collected, total_other_revenue, total_revenue,
        total_maintenance, total_payroll, total_utilities, total_admin, total_expenses, net_income,
        management_fee_pct, management_fee_amount, owner_net_amount, status, pdf_url, notes
    )
    SELECT v_owner1_id, v_property2_id, 4, 2026, 5200, 600, 5800, 0, 0, 800, 0, 800, 5000,
           7.5, 435, 4565, 'SENT', '/files/demo/owner-statement-2026-04.pdf', 'April statement for property 2'
    WHERE NOT EXISTS (
        SELECT 1 FROM owner_statements WHERE owner_id = v_owner1_id AND property_id = v_property2_id AND statement_year = 2026 AND statement_month = 4
    );

    INSERT INTO notifications (
        recipient_user_id, actor_user_id, property_id, request_id, type, title, message, is_read, is_sent, sent_at, recipient_type, channel, related_entity, related_id
    )
    SELECT v_admin_user_id, v_accountant_user_id, v_property1_id, NULL, 'FINANCE_ALERT', 'اعتماد مصروف جديد', 'تم اعتماد مصروف صيانة المصعد بمبلغ 1,500 ريال.', FALSE, TRUE, NOW() - INTERVAL '7 day', 'ADMIN', 'IN_APP', 'EXPENSE', 1
    WHERE NOT EXISTS (
        SELECT 1 FROM notifications WHERE recipient_user_id = v_admin_user_id AND title = 'اعتماد مصروف جديد'
    );

    INSERT INTO notifications (
        recipient_user_id, actor_user_id, property_id, request_id, type, title, message, is_read, is_sent, sent_at, recipient_type, channel, related_entity, related_id
    )
    SELECT v_accountant_user_id, v_maintenance_user_id, v_property1_id, 1, 'MAINTENANCE_UPDATE', 'تم جدولة طلب صيانة', 'تم جدولة طلب الصيانة MR-2026-00001 ليوم الغد.', FALSE, TRUE, NOW() - INTERVAL '1 day', 'ACCOUNTANT', 'IN_APP', 'MAINTENANCE_REQUEST', 1
    WHERE NOT EXISTS (
        SELECT 1 FROM notifications WHERE recipient_user_id = v_accountant_user_id AND title = 'تم جدولة طلب صيانة'
    );

    INSERT INTO notifications (
        recipient_user_id, actor_user_id, property_id, request_id, type, title, message, is_read, is_sent, sent_at, recipient_type, channel, related_entity, related_id, read_at
    )
    SELECT v_owner_user_id, v_property_admin_id, v_property2_id, NULL, 'OWNER_STATEMENT', 'كشف حساب جديد', 'تم إصدار كشف حساب شهر أبريل لعقار مجمع النخيل الإداري.', TRUE, TRUE, NOW() - INTERVAL '2 day', 'OWNER', 'IN_APP', 'OWNER_STATEMENT', 2, NOW() - INTERVAL '1 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM notifications WHERE recipient_user_id = v_owner_user_id AND title = 'كشف حساب جديد'
    );

    INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, entity_label, old_value, new_value, changed_fields, property_id, notes, created_at)
    SELECT v_property_admin_id, 'مدير العقار التجريبي', 'PROPERTY_ADMIN', 'UPDATE', 'PropertyModuleSetting', v_property2_id,
           'Property PROP-QC-002 modules', '{"finance":true,"contracts":true}'::jsonb, '{"finance":false,"contracts":false,"maintenance":true}'::jsonb,
           '["finance","contracts","maintenance"]'::jsonb, v_property2_id, 'Preset changed to maintenance only', NOW() - INTERVAL '2 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM audit_logs WHERE entity_type = 'PropertyModuleSetting' AND entity_id = v_property2_id
    );

    INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, entity_label, old_value, new_value, changed_fields, property_id, notes, created_at)
    SELECT v_hr_user_id, 'أخصائي الموارد البشرية', 'HR_OFFICER', 'APPROVE', 'PayrollRun', v_payroll_run_id,
           'Payroll 03/2026', '{"status":"DRAFT"}'::jsonb, '{"status":"PAID"}'::jsonb, '["status"]'::jsonb, v_property1_id,
           'QC seeded payroll lifecycle', NOW() - INTERVAL '30 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM audit_logs WHERE entity_type = 'PayrollRun' AND entity_id = v_payroll_run_id
    );

    INSERT INTO property_module_settings (property_id, module_key, is_enabled)
    SELECT v_property1_id, md.module_key, TRUE
    FROM module_definitions md
    WHERE NOT EXISTS (
        SELECT 1 FROM property_module_settings pms
        WHERE pms.property_id = v_property1_id AND pms.module_key = md.module_key
    );

    INSERT INTO property_module_settings (property_id, module_key, is_enabled)
    SELECT v_property2_id, md.module_key,
           CASE WHEN md.module_key IN ('maintenance', 'inventory', 'vendors', 'reports', 'notifications') THEN TRUE ELSE FALSE END
    FROM module_definitions md
    WHERE NOT EXISTS (
        SELECT 1 FROM property_module_settings pms
        WHERE pms.property_id = v_property2_id AND pms.module_key = md.module_key
    );

    UPDATE properties
    SET total_units = (SELECT COUNT(*) FROM units WHERE property_id = properties.id AND is_active = TRUE),
        total_floors = COALESCE((SELECT COUNT(*) FROM floors WHERE property_id = properties.id), 0),
        updated_at = NOW()
    WHERE id IN (v_property1_id, v_property2_id);
END $$;
