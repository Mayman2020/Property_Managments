-- V151: Full Demo Seed — 4 Properties, 2 Floors Each, All Modules Populated
-- Purges all existing operational data, keeps SUPER_ADMIN user + lookups/roles/settings.
-- Password for all created users: 12345

SET search_path = property_mgmt;

-- ============================================================
-- STEP 1: PURGE ALL OPERATIONAL DATA
-- ============================================================
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'payslips','employee_bonuses','salary_advances','attendance',
        'leave_requests','leave_balances','payroll_runs',
        'petty_cash','owner_statements','budgets','financial_periods',
        'expenses','other_revenues',
        'maintenance_contract_invoices','maintenance_contracts',
        'property_maintenance_assignments','maintenance_providers',
        'maintenance_invoices','vendor_ratings','request_attachments',
        'visit_report_items','visit_ratings','visit_reports',
        'maintenance_requests',
        'rent_receipts','rent_payments','rent_payment_schedule',
        'contract_attachments','contract_clauses','contract_renewals',
        'contract_notifications','contract_fees','violations_complaints',
        'inspection_photos','unit_inspections','lease_contracts',
        'contract_action_requests',
        'vacancy_photos','rental_inquiries','vacancy_listings',
        'inventory_transactions','inventory_items',
        'vendor_contracts','vendors','contractor_companies',
        'property_attachments','tenant_owner_attachments',
        'tenants','units','floors',
        'property_owners','properties','owners',
        'employees','departments',
        'notification_deliveries','notifications','audit_logs'
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

-- Delete all non-SUPER_ADMIN users
DELETE FROM users WHERE role != 'SUPER_ADMIN';

-- Reset code generation counters
DELETE FROM code_generation_state
WHERE code_type IN ('PROPERTY','UNIT','MR','CNT','INV','OWN','TEN','EMP','VEN');

-- ============================================================
-- STEP 1b: RESTORE SUPER_ADMIN (TRUNCATE CASCADE on properties wipes users)
-- ============================================================
INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
OVERRIDING SYSTEM VALUE VALUES
(1, 'superadmin', 'admin@propmgmt.com',
 '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS',
 'Super Administrator', 'SUPER_ADMIN', TRUE)
ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role          = 'SUPER_ADMIN',
        is_active     = TRUE;

SELECT setval('users_id_seq', 1);

-- ============================================================
-- STEP 2: OWNERS  (4 owners, one per property)
-- ============================================================
INSERT INTO owners (id, full_name, full_name_ar, full_name_en, national_id, phone, email, address, notes, is_active, portal_access)
OVERRIDING SYSTEM VALUE VALUES
(1, 'أحمد بن عبدالله السعيد',  'أحمد بن عبدالله السعيد',  'Ahmed Abdullah Al-Saeed',    '1012345678', '+966501234501', 'ahmed.alsaeed@email.com',    'الرياض، حي العليا',       'مالك برج الياسمين السكني',         TRUE, TRUE),
(2, 'فاطمة محمد الزهراني',     'فاطمة محمد الزهراني',     'Fatima Mohammed Al-Zahrani', '1023456789', '+966502345602', 'fatima.alzahrani@email.com', 'جدة، حي الروضة',           'مالكة مركز الأعمال التجاري',       TRUE, TRUE),
(3, 'محمد عبدالرحمن القحطاني', 'محمد عبدالرحمن القحطاني', 'Mohammed Abdulrahman Al-Qahtani', '1034567890', '+966503456703', 'mohammed.qahtani@email.com','الدمام، حي النزهة',        'مالك مجمع النخيل',                TRUE, TRUE),
(4, 'سعيد بن علي الغامدي',     'سعيد بن علي الغامدي',     'Saeed Ali Al-Ghamdi',        '1045678901', '+966504567804', 'saeed.alghamdi@email.com',   'المدينة المنورة، حي العزيزية', 'مالك برج الأفق',              TRUE, TRUE);

SELECT setval('owners_id_seq', 4);

-- ============================================================
-- STEP 3: PROPERTIES
-- ============================================================
INSERT INTO properties (id, owner_id, property_name, property_name_ar, property_name_en, property_code, property_type, address, city, country, total_floors, total_units, description, is_active)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'برج الياسمين',          'برج الياسمين',          'Jasmine Tower',        'PROP-001', 'RESIDENTIAL', 'شارع الأمير فيصل، حي العليا، الرياض',  'الرياض',   'Saudi Arabia', 2, 6,  'برج سكني فاخر يضم شققاً بمواصفات عالية ومرافق متكاملة',                       TRUE),
(2, 2, 'مركز الأعمال التجاري',  'مركز الأعمال التجاري',  'Business Center',      'PROP-002', 'COMMERCIAL',  'طريق الملك فهد، حي الروضة، جدة',       'جدة',      'Saudi Arabia', 2, 6,  'مركز تجاري متكامل يضم محلات ومكاتب في موقع استراتيجي وسط المدينة',           TRUE),
(3, 3, 'مجمع النخيل',           'مجمع النخيل',           'Palm Complex',         'PROP-003', 'MIXED',       'شارع الأمير نايف، حي النزهة، الدمام',  'الدمام',   'Saudi Arabia', 2, 6,  'مجمع متعدد الاستخدامات يجمع بين الوحدات السكنية والتجارية في بيئة هادئة',   TRUE),
(4, 4, 'برج الأفق الزجاجي',     'برج الأفق الزجاجي',     'Horizon Glass Tower',  'PROP-004', 'RESIDENTIAL', 'شارع الملك عبدالعزيز، حي العزيزية، المدينة المنورة', 'المدينة المنورة', 'Saudi Arabia', 2, 6, 'برج سكني عصري بواجهة زجاجية وإطلالات بانورامية رائعة',  TRUE);

SELECT setval('properties_id_seq', 4);

-- ============================================================
-- STEP 4: USERS  (non-admin)
-- password_hash = bcrypt('12345') rounds=10
-- ============================================================
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, property_id, is_active)
OVERRIDING SYSTEM VALUE VALUES
-- General Managers (was PROPERTY_ADMIN)
(2,  'admin_jasmine',  'admin.jasmine@propmgmt.com',  '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'مدير برج الياسمين',         '+966511111101', 'GENERAL_MANAGER',            1, TRUE),
(3,  'admin_business', 'admin.business@propmgmt.com', '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'مدير مركز الأعمال',         '+966511111102', 'GENERAL_MANAGER',            2, TRUE),
(4,  'admin_nakheel',  'admin.nakheel@propmgmt.com',  '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'مدير مجمع النخيل',          '+966511111103', 'GENERAL_MANAGER',            3, TRUE),
(5,  'admin_horizon',  'admin.horizon@propmgmt.com',  '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'مدير برج الأفق',             '+966511111104', 'GENERAL_MANAGER',            4, TRUE),
-- Accountant
(6,  'accountant1',    'accountant@propmgmt.com',     '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'خالد المحاسب',              '+966522222201', 'ACCOUNTANT',                 NULL, TRUE),
-- Maintenance Officers (INTERNAL = property staff)
(7,  'officer_khalid', 'officer.khalid@propmgmt.com', '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'خالد بن سعد العتيبي',       '+966533333301', 'MAINTENANCE_OFFICER_INTERNAL',1, TRUE),
(8,  'officer_omar',   'officer.omar@propmgmt.com',   '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'عمر بن فهد الحربي',          '+966533333302', 'MAINTENANCE_OFFICER_INTERNAL',3, TRUE),
-- Owners
(9,  'owner_ahmed',    'ahmed.alsaeed@email.com',     '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'أحمد بن عبدالله السعيد',    '+966501234501', 'OWNER',                NULL, TRUE),
(10, 'owner_fatima',   'fatima.alzahrani@email.com',  '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'فاطمة محمد الزهراني',       '+966502345602', 'OWNER',                NULL, TRUE),
(11, 'owner_mohammed', 'mohammed.qahtani@email.com',  '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'محمد عبدالرحمن القحطاني',   '+966503456703', 'OWNER',                NULL, TRUE),
(12, 'owner_saeed',    'saeed.alghamdi@email.com',    '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'سعيد بن علي الغامدي',       '+966504567804', 'OWNER',                NULL, TRUE),
-- Tenant users (one per property, linked to first unit)
(13, 'tenant_rami',    'rami.sulaiman@email.com',     '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'رامي بن أحمد السليمان',     '+966544444401', 'TENANT',               1, TRUE),
(14, 'tenant_sara',    'sara.hashim@email.com',       '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'سارة بنت محمد الهاشم',      '+966544444402', 'TENANT',               2, TRUE),
(15, 'tenant_ali',     'ali.qahtani@email.com',       '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'علي بن ناصر القحطاني',      '+966544444403', 'TENANT',               3, TRUE),
(16, 'tenant_nora',    'nora.ahmadi@email.com',       '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS', 'نورة بنت سالم الأحمدي',     '+966544444404', 'TENANT',               4, TRUE);

SELECT setval('users_id_seq', 16);

-- Link owner users to owner records
UPDATE owners SET user_id = 9  WHERE id = 1;
UPDATE owners SET user_id = 10 WHERE id = 2;
UPDATE owners SET user_id = 11 WHERE id = 3;
UPDATE owners SET user_id = 12 WHERE id = 4;

-- ============================================================
-- STEP 5: FLOORS  (2 per property)
-- ============================================================
INSERT INTO floors (id, property_id, floor_number, floor_label)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 (برج الياسمين)
(1, 1, 1, 'الطابق الأول'),
(2, 1, 2, 'الطابق الثاني'),
-- Property 2 (مركز الأعمال)
(3, 2, 1, 'الطابق الأول'),
(4, 2, 2, 'الطابق الثاني'),
-- Property 3 (مجمع النخيل)
(5, 3, 1, 'الطابق الأول'),
(6, 3, 2, 'الطابق الثاني'),
-- Property 4 (برج الأفق)
(7, 4, 1, 'الطابق الأول'),
(8, 4, 2, 'الطابق الثاني');

SELECT setval('floors_id_seq', 8);

-- ============================================================
-- STEP 6: UNITS  (3 per floor = 6 per property = 24 total)
-- ============================================================
INSERT INTO units (id, property_id, floor_id, unit_number, unit_type, area_sqm, bedrooms, bathrooms, is_rented, rent_amount, currency, furnished_status, notes, is_active)
OVERRIDING SYSTEM VALUE VALUES
-- ===== Property 1 (برج الياسمين) – Residential =====
-- Floor 1
(1,  1, 1, '101', 'APARTMENT', 85.00,  2, 2, TRUE,  3000.00, 'SAR', 'UNFURNISHED', 'شقة هادئة مع إطلالة على الحديقة، تشمل مطبخاً مجهزاً ودخولاً مستقلاً', TRUE),
(2,  1, 1, '102', 'APARTMENT', 90.00,  2, 2, TRUE,  3200.00, 'SAR', 'FURNISHED',   'شقة مفروشة بالكامل بأثاث فاخر، تشمل غرفة معيشة واسعة وتكييف مركزي',  TRUE),
(3,  1, 1, '103', 'APARTMENT', 75.00,  1, 1, TRUE,  2200.00, 'SAR', 'UNFURNISHED', 'شقة مريحة بغرفة نوم واحدة مناسبة للأفراد، موقع متميز قريب من المصعد',  TRUE),
-- Floor 2
(4,  1, 2, '201', 'APARTMENT', 120.00, 3, 3, TRUE,  4500.00, 'SAR', 'UNFURNISHED', 'شقة فسيحة بثلاث غرف نوم مع تراس خاص وإطلالة بانورامية على المدينة',    TRUE),
(5,  1, 2, '202', 'APARTMENT', 95.00,  2, 2, TRUE,  3500.00, 'SAR', 'FURNISHED',   'شقة مفروشة فاخرة مع بلكونة مطلة على الشارع الرئيسي',                   TRUE),
(6,  1, 2, '203', 'STUDIO',    45.00,  0, 1, TRUE,  1500.00, 'SAR', 'FURNISHED',   'استوديو مفروش حديث مناسب لطالب أو مقيم بمفرده، خدمات مشتركة ممتازة',   TRUE),

-- ===== Property 2 (مركز الأعمال) – Commercial =====
-- Floor 1
(7,  2, 3, '101', 'SHOP',      50.00,  NULL, NULL, TRUE, 2500.00, 'SAR', NULL, 'محل تجاري على الواجهة الرئيسية، واجهة زجاجية بعرض 6 متر، تمديدات كهربائية جاهزة', TRUE),
(8,  2, 3, '102', 'SHOP',      65.00,  NULL, NULL, TRUE, 3200.00, 'SAR', NULL, 'محل تجاري زاوية بمدخلين، مساحة إضافية للتخزين، موقع متميز عند المدخل الرئيسي',   TRUE),
(9,  2, 3, '103', 'OFFICE',    80.00,  NULL, NULL, TRUE, 4000.00, 'SAR', NULL, 'مكتب مجهز بالتكييف والتمديدات الشبكية وغرفة اجتماعات داخلية وحمام خاص',           TRUE),
-- Floor 2
(10, 2, 4, '201', 'OFFICE',   100.00,  NULL, NULL, TRUE, 5000.00, 'SAR', NULL, 'مكتب تنفيذي بإطلالة على الشارع، يضم مكتبتين وغرفة اجتماعات ومنطقة استقبال',        TRUE),
(11, 2, 4, '202', 'OFFICE',   120.00,  NULL, NULL, TRUE, 6000.00, 'SAR', NULL, 'مكتب فاخر بمساحة مفتوحة مناسبة لفريق عمل كامل، نوافذ بانورامية وتصميم عصري',       TRUE),
(12, 2, 4, '203', 'OFFICE',    75.00,  NULL, NULL, TRUE, 3750.00, 'SAR', NULL, 'مكتب متوسط الحجم مناسب للشركات الناشئة، يشمل غرفة أرشيف وحمام خاص ومطبخ صغير',    TRUE),

-- ===== Property 3 (مجمع النخيل) – Mixed =====
-- Floor 1
(13, 3, 5, '101', 'SHOP',      40.00,  NULL, NULL, TRUE, 2000.00, 'SAR', NULL, 'محل تجاري بالقرب من المدخل الرئيسي للمجمع مناسب للبيع بالتجزئة والخدمات',          TRUE),
(14, 3, 5, '102', 'APARTMENT', 85.00,  2, 2, TRUE,  2800.00, 'SAR', 'UNFURNISHED', 'شقة سكنية هادئة مطلة على الحديقة الداخلية للمجمع مع مواقف سيارات خاصة',  TRUE),
(15, 3, 5, '103', 'APARTMENT', 70.00,  2, 1, TRUE,  2500.00, 'SAR', 'UNFURNISHED', 'شقة بغرفتين نوم وحمام واحد مناسبة للعائلات الصغيرة بإيجار تنافسي',        TRUE),
-- Floor 2
(16, 3, 6, '201', 'APARTMENT', 95.00,  2, 2, TRUE,  3000.00, 'SAR', 'FURNISHED',   'شقة مفروشة بالطابق الثاني مع إطلالة مميزة ومطبخ مجهز بالكامل',            TRUE),
(17, 3, 6, '202', 'APARTMENT', 80.00,  2, 2, TRUE,  2700.00, 'SAR', 'UNFURNISHED', 'شقة مريحة مع مخزن إضافي وخزانة ملابس واسعة وحمامين',                     TRUE),
(18, 3, 6, '203', 'OFFICE',    65.00,  NULL, NULL, TRUE, 3200.00, 'SAR', NULL, 'مكتب مميز في الطابق الثاني مع إطلالة هادئة يمتاز بالهدوء ومناسب للمهن الحرة',      TRUE),

-- ===== Property 4 (برج الأفق) – Residential =====
-- Floor 1
(19, 4, 7, '101', 'STUDIO',    40.00,  0, 1, TRUE,  1500.00, 'SAR', 'FURNISHED',   'استوديو مجهز بالكامل في الطابق الأول، مناسب للأفراد والطلاب، دخول مستقل',   TRUE),
(20, 4, 7, '102', 'APARTMENT', 75.00,  1, 1, TRUE,  2000.00, 'SAR', 'UNFURNISHED', 'شقة بغرفة نوم واحدة في موضع هادئ بالطابق الأول قريبة من المصعد',           TRUE),
(21, 4, 7, '103', 'APARTMENT', 90.00,  2, 2, FALSE, 2800.00, 'SAR', 'UNFURNISHED', 'شقة بغرفتين نوم قيد انتظار اعتماد العقد من المالك، مساحة واسعة وإضاءة جيدة', TRUE),
-- Floor 2
(22, 4, 8, '201', 'APARTMENT', 110.00, 3, 2, FALSE, 4000.00, 'SAR', 'UNFURNISHED', 'شقة واسعة بثلاث غرف نوم قيد انتظار اعتماد العقد من المالك، تراس خاص',      TRUE),
(23, 4, 8, '202', 'VILLA',    180.00,  4, 3, FALSE, 8000.00, 'SAR', 'UNFURNISHED', 'فيلا دوبلكس فاخرة — العقد السابق انتهى بسبب عدم الالتزام بالسداد',          TRUE),
(24, 4, 8, '203', 'APARTMENT', 85.00,  2, 2, FALSE, 2900.00, 'SAR', 'UNFURNISHED', 'شقة بغرفتين نوم — العقد السابق منتهٍ بناءً على طلب المستأجر بعد انتهاء مدته', TRUE);

SELECT setval('units_id_seq', 24);

-- ============================================================
-- STEP 7: PROPERTY_OWNERS  (junction table)
-- ============================================================
INSERT INTO property_owners (property_id, owner_id) VALUES
(1, 1), (2, 2), (3, 3), (4, 4);

-- ============================================================
-- STEP 8: TENANTS  (24 tenants — one per unit)
-- ============================================================
INSERT INTO tenants (id, user_id, unit_id, full_name, full_name_ar, full_name_en, national_id, phone, email, lease_start, lease_end, is_active, notes)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 tenants (units 1-6)
(1,  13,   1, 'رامي بن أحمد السليمان',      'رامي بن أحمد السليمان',      'Rami Ahmed Al-Sulaiman',       '1056781001', '+966544444401', 'rami.sulaiman@email.com',    '2025-06-01', '2026-05-31', TRUE, 'مستأجر ملتزم، يفضل التواصل عبر الواتساب'),
(2,  NULL,  2, 'حصة بنت ناصر الدوسري',       'حصة بنت ناصر الدوسري',       'Hessa Nasser Al-Dosari',       '1067892002', '+966544444411', 'hessa.dosari@email.com',     '2025-06-01', '2026-05-31', TRUE, 'شقة مفروشة — دفع مسبق لأول شهر'),
(3,  NULL,  3, 'وليد بن عبدالله الحربي',      'وليد بن عبدالله الحربي',      'Waleed Abdullah Al-Harbi',     '1078903003', '+966544444412', 'waleed.harbi@email.com',     '2025-06-01', '2026-05-31', TRUE, 'يعمل في القطاع الصحي، دوام مسائي'),
(4,  NULL,  4, 'نورة بنت خالد الرشيدي',       'نورة بنت خالد الرشيدي',       'Noura Khalid Al-Rashidi',      '1089014004', '+966544444413', 'noura.rashidi@email.com',    '2025-06-01', '2026-05-31', TRUE, 'أسرة من 4 أفراد — طلب تحسين غرفة التخزين'),
(5,  NULL,  5, 'سامر بن يوسف الشهري',         'سامر بن يوسف الشهري',         'Samer Yousef Al-Shehri',       '1090125005', '+966544444414', 'samer.shehri@email.com',     '2025-06-01', '2026-05-31', TRUE, 'رجل أعمال، يُفضل الدفع عبر تحويل بنكي'),
(6,  NULL,  6, 'ليلى بنت سالم العتيبي',        'ليلى بنت سالم العتيبي',        'Layla Salem Al-Otaibi',        '1001236006', '+966544444415', 'layla.otaibi@email.com',     '2025-06-01', '2026-05-31', TRUE, 'طالبة جامعية، تسكن بمفردها'),
-- Property 2 tenants (units 7-12)
(7,  14,   7, 'سارة بنت محمد الهاشم',         'سارة بنت محمد الهاشم',         'Sara Mohammed Al-Hashim',      '1012347007', '+966544444402', 'sara.hashim@email.com',      '2025-07-01', '2026-06-30', TRUE, 'صاحبة بوتيك ملابس — محل رائج'),
(8,  NULL,  8, 'طارق بن علي الزهراني',         'طارق بن علي الزهراني',         'Tariq Ali Al-Zahrani',         '1023458008', '+966544444421', 'tariq.zahrani@email.com',    '2025-07-01', '2026-06-30', TRUE, 'صاحب محل إلكترونيات، زاوية مميزة'),
(9,  NULL,  9, 'مها بنت فيصل الغامدي',         'مها بنت فيصل الغامدي',         'Maha Faisal Al-Ghamdi',        '1034569009', '+966544444422', 'maha.ghamdi@email.com',      '2025-07-01', '2026-06-30', TRUE, 'مكتب محاماة وخدمات قانونية — عقد 5 سنوات مرغوب'),
(10, NULL, 10, 'خالد بن ماجد العنزي',           'خالد بن ماجد العنزي',           'Khalid Majed Al-Anazi',        '1045670010', '+966544444423', 'khalid.anazi@email.com',     '2025-07-01', '2026-06-30', TRUE, 'شركة استشارات هندسية'),
(11, NULL, 11, 'ريم بنت أحمد الشهراني',         'ريم بنت أحمد الشهراني',         'Reem Ahmed Al-Shahrani',       '1056781011', '+966544444424', 'reem.shahrani@email.com',    '2025-07-01', '2026-06-30', TRUE, 'شركة تصميم داخلي — تأخر في دفع الأشهر الأخيرة'),
(12, NULL, 12, 'فهد بن سعود المطيري',           'فهد بن سعود المطيري',           'Fahad Saud Al-Mutairi',        '1067892012', '+966544444425', 'fahad.mutairi@email.com',    '2025-07-01', '2026-06-30', TRUE, 'شركة تقنية ناشئة — عميل مميز'),
-- Property 3 tenants (units 13-18)
(13, 15,  13, 'علي بن ناصر القحطاني',           'علي بن ناصر القحطاني',           'Ali Nasser Al-Qahtani',        '1078903013', '+966544444403', 'ali.qahtani@email.com',      '2025-08-01', '2026-07-31', TRUE, 'صاحب بقالة ومستلزمات يومية'),
(14, NULL, 14, 'دانا بنت هشام الجهني',           'دانا بنت هشام الجهني',           'Dana Hisham Al-Juhani',        '1089014014', '+966544444431', 'dana.juhani@email.com',      '2025-08-01', '2026-07-31', TRUE, 'موظفة حكومية، هادئة وملتزمة'),
(15, NULL, 15, 'يوسف بن إبراهيم الملكي',         'يوسف بن إبراهيم الملكي',         'Yousef Ibrahim Al-Malki',      '1090125015', '+966544444432', 'yousef.malki@email.com',     '2025-08-01', '2026-07-31', TRUE, 'يعمل مهندساً في أرامكو'),
(16, NULL, 16, 'أميرة بنت تركي البيشي',           'أميرة بنت تركي البيشي',           'Amira Turki Al-Bishi',         '1001236016', '+966544444433', 'amira.bishi@email.com',      '2025-08-01', '2026-07-31', TRUE, 'شقة مفروشة، موظفة بالقطاع الخاص'),
(17, NULL, 17, 'منصور بن حمد الصقري',            'منصور بن حمد الصقري',            'Mansour Hamad Al-Saqri',       '1012347017', '+966544444434', 'mansour.saqri@email.com',    '2025-08-01', '2026-07-31', TRUE, 'أسرة من 3 أفراد — متعاون جداً'),
(18, NULL, 18, 'هند بنت عبدالعزيز السبيعي',      'هند بنت عبدالعزيز السبيعي',      'Hind Abdulaziz Al-Subaie',     '1023458018', '+966544444435', 'hind.subaie@email.com',      '2025-08-01', '2026-07-31', TRUE, 'مكتب خدمات ترجمة واحترافية'),
-- Property 4 tenants (units 19-24)
(19, 16,  19, 'نورة بنت سالم الأحمدي',           'نورة بنت سالم الأحمدي',           'Nora Salem Al-Ahmadi',         '1034569019', '+966544444404', 'nora.ahmadi@email.com',      '2025-09-01', '2026-08-31', TRUE, 'طالبة دراسات عليا، هادئة ومنظمة'),
(20, NULL, 20, 'عبدالعزيز بن محمد الدوسري',      'عبدالعزيز بن محمد الدوسري',      'Abdulaziz Mohammed Al-Dawsari','1045670020', '+966544444441', 'abdulaziz.dawsari@email.com','2025-09-01', '2026-08-31', TRUE, 'يعمل في البنك الأهلي'),
(21, NULL, 21, 'رهف بنت صالح الزهراني',           'رهف بنت صالح الزهراني',           'Rahaf Saleh Al-Zahrani',       '1056781021', '+966544444442', 'rahaf.zahrani@email.com',    NULL,         NULL,         TRUE, 'عقد جديد قيد موافقة المالك'),
(22, NULL, 22, 'مروان بن عبدالله الثقفي',         'مروان بن عبدالله الثقفي',         'Marwan Abdullah Al-Thaqafi',   '1067892022', '+966544444443', 'marwan.thaqafi@email.com',   NULL,         NULL,         TRUE, 'عقد جديد قيد موافقة المالك'),
(23, NULL, 23, 'فاطمة بنت علي البركات',           'فاطمة بنت علي البركات',           'Fatimah Ali Al-Barakat',       '1078903023', '+966544444444', 'fatimah.barakat@email.com',  '2024-06-01', '2025-05-31', FALSE,'عقد منتهٍ — إنهاء بسبب عدم الالتزام بالسداد'),
(24, NULL, 24, 'زيد بن أحمد الرقيبة',             'زيد بن أحمد الرقيبة',             'Zaid Ahmed Al-Rugaibah',       '1089014024', '+966544444445', 'zaid.rugaibah@email.com',    '2024-06-01', '2025-05-31', FALSE,'عقد منتهٍ — انتهاء بمرور المدة وطلب المستأجر');

SELECT setval('tenants_id_seq', 24);

-- ============================================================
-- STEP 9: CONTRACTOR COMPANIES (3 maintenance companies)
-- ============================================================
INSERT INTO contractor_companies (id, name, name_ar, name_en, phone, email, notes, active)
OVERRIDING SYSTEM VALUE VALUES
(1, 'شركة الإبداع للصيانة العامة',       'شركة الإبداع للصيانة العامة',       'Al-Ibda General Maintenance Co.',     '+966512001001', 'info@alibda-maintenance.com', 'متخصصة في الصيانة العامة والأعمال المدنية والنجارة والدهانات — خبرة 15 سنة', TRUE),
(2, 'مؤسسة التقنية للتكييف والكهرباء',   'مؤسسة التقنية للتكييف والكهرباء',   'Tech HVAC & Electrical Institution', '+966513002002', 'info@tech-hvac.com',          'متخصصة في أنظمة التكييف المركزي والأعمال الكهربائية وصيانة المصاعد',        TRUE),
(3, 'شركة الأمان للسباكة والتمديدات',    'شركة الأمان للسباكة والتمديدات',    'Al-Aman Plumbing & Pipelines Co.',   '+966514003003', 'info@alaman-plumbing.com',    'متخصصة في السباكة وتمديدات المياه وشبكات الصرف الصحي وإصلاح التسربات',     TRUE);

SELECT setval('contractor_companies_id_seq', 3);

-- ============================================================
-- STEP 10: DEPARTMENTS
-- ============================================================
INSERT INTO departments (id, property_id, dept_name_ar, dept_name_en, is_active)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'قسم الصيانة — برج الياسمين', 'Maintenance Dept — Jasmine Tower',  TRUE),
(2, 3, 'قسم الصيانة — مجمع النخيل',  'Maintenance Dept — Palm Complex',   TRUE),
(3, 2, 'قسم الإدارة — مركز الأعمال', 'Admin Dept — Business Center',      TRUE);

SELECT setval('departments_id_seq', 3);

-- ============================================================
-- STEP 11: EMPLOYEES  (5 employees)
-- ============================================================
INSERT INTO employees (id, employee_code, full_name, national_id, nationality, gender, phone, email,
    department_id, property_id, job_title_ar, job_title_en, employment_type,
    hire_date, basic_salary, housing_allowance, transport_allowance, currency, status, linked_user_id, notes)
OVERRIDING SYSTEM VALUE VALUES
(1, 'EMP-001', 'خالد بن سعد العتيبي',   '1011112221', 'سعودي', 'MALE',   '+966533333301', 'officer.khalid@propmgmt.com', 1, 1,
    'مسؤول الصيانة','Maintenance Officer', 'FULL_TIME',
    '2022-03-15', 6000.00, 800.00, 400.00, 'SAR', 'ACTIVE', 7,
    'مسؤول الصيانة الرئيسي في برج الياسمين ومركز الأعمال، خبرة 8 سنوات في الصيانة العامة'),
(2, 'EMP-002', 'عمر بن فهد الحربي',     '1022223332', 'سعودي', 'MALE',   '+966533333302', 'officer.omar@propmgmt.com',   2, 3,
    'مسؤول الصيانة','Maintenance Officer', 'FULL_TIME',
    '2023-01-10', 5500.00, 700.00, 350.00, 'SAR', 'ACTIVE', 8,
    'مسؤول الصيانة في مجمع النخيل وبرج الأفق، متخصص في السباكة والكهرباء'),
(3, 'EMP-003', 'محمد بن سلطان الشهري',  '1033334443', 'سعودي', 'MALE',   '+966533333303', NULL,                          1, 1,
    'فني صيانة','Maintenance Technician', 'FULL_TIME',
    '2023-06-01', 4000.00, 500.00, 300.00, 'SAR', 'ACTIVE', NULL,
    'فني صيانة عامة في برج الياسمين — متخصص في الدهانات والتشطيبات'),
(4, 'EMP-004', 'أحمد بن حمد القحطاني',  '1044445554', 'سعودي', 'MALE',   '+966533333304', NULL,                          3, 2,
    'مدير إداري','Administrative Manager', 'FULL_TIME',
    '2021-09-01', 7000.00, 1000.00, 500.00, 'SAR', 'ACTIVE', NULL,
    'مدير إداري في مركز الأعمال التجاري — مسؤول عن التنسيق مع المستأجرين التجاريين'),
(5, 'EMP-005', 'عبدالله بن ماجد السهلي', '1055556665', 'سعودي', 'MALE',   '+966533333305', NULL,                          2, 3,
    'فني صيانة','Maintenance Technician', 'PART_TIME',
    '2024-01-15', 2500.00, 0.00, 200.00, 'SAR', 'ACTIVE', NULL,
    'فني صيانة بدوام جزئي في مجمع النخيل — متخصص في تكييف وسباكة');

SELECT setval('employees_id_seq', 5);

-- Update department managers
UPDATE departments SET manager_id = 1 WHERE id = 1;
UPDATE departments SET manager_id = 2 WHERE id = 2;
UPDATE departments SET manager_id = 4 WHERE id = 3;

-- ============================================================
-- STEP 12: MAINTENANCE PROVIDERS
-- ============================================================
INSERT INTO maintenance_providers (id, provider_type, user_id, company_id, status)
OVERRIDING SYSTEM VALUE VALUES
(1, 'USER',    7,    NULL, 'ACTIVE'),   -- خالد العتيبي (officer)
(2, 'USER',    8,    NULL, 'ACTIVE'),   -- عمر الحربي (officer)
(3, 'COMPANY', NULL, 1,   'ACTIVE'),   -- شركة الإبداع للصيانة العامة
(4, 'COMPANY', NULL, 2,   'ACTIVE'),   -- مؤسسة التقنية للتكييف والكهرباء
(5, 'COMPANY', NULL, 3,   'ACTIVE');   -- شركة الأمان للسباكة والتمديدات

SELECT setval('maintenance_providers_id_seq', 5);

-- ============================================================
-- STEP 13: PROPERTY MAINTENANCE ASSIGNMENTS
-- ============================================================
INSERT INTO property_maintenance_assignments (id, property_id, maintenance_provider_id, is_primary, start_date, status, notes)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 (برج الياسمين): خالد مسؤول رئيسي + شركة الأمان للسباكة
(1, 1, 1, TRUE,  '2022-03-15', 'ACTIVE', 'خالد العتيبي مسؤول الصيانة الرئيسي في برج الياسمين'),
(2, 1, 5, FALSE, '2023-01-01', 'ACTIVE', 'شركة الأمان للسباكة مسؤولة عن تمديدات المياه والصرف الصحي'),
-- Property 2 (مركز الأعمال): مؤسسة التقنية مسؤولة + خالد أيضاً
(3, 2, 4, TRUE,  '2023-01-01', 'ACTIVE', 'مؤسسة التقنية مسؤولة عن التكييف والكهرباء في مركز الأعمال'),
(4, 2, 1, FALSE, '2022-03-15', 'ACTIVE', 'خالد العتيبي يتابع الأعمال اليومية في مركز الأعمال'),
-- Property 3 (مجمع النخيل): عمر مسؤول رئيسي + شركة الإبداع
(5, 3, 2, TRUE,  '2023-01-10', 'ACTIVE', 'عمر الحربي مسؤول الصيانة الرئيسي في مجمع النخيل'),
(6, 3, 3, FALSE, '2023-06-01', 'ACTIVE', 'شركة الإبداع مسؤولة عن الأعمال المدنية والتشطيبات'),
-- Property 4 (برج الأفق): شركة الأمان مسؤولة + شركة التقنية للتكييف
(7, 4, 5, TRUE,  '2024-01-01', 'ACTIVE', 'شركة الأمان للسباكة مسؤولة عن صيانة برج الأفق'),
(8, 4, 4, FALSE, '2024-01-01', 'ACTIVE', 'مؤسسة التقنية مسؤولة عن التكييف المركزي في برج الأفق');

SELECT setval('property_maintenance_assignments_id_seq', 8);

-- ============================================================
-- STEP 14: LEASE CONTRACTS  (24 contracts)
-- ============================================================
-- Contracts 1-6: Property 1, ACTIVE (Jun 2025 – May 2026)
-- Contracts 7-12: Property 2, ACTIVE (Jul 2025 – Jun 2026)
-- Contracts 13-18: Property 3, ACTIVE (Aug 2025 – Jul 2026)
-- Contracts 19-20: Property 4, ACTIVE (Sep 2025 – Aug 2026)
-- Contracts 21-22: Property 4, PENDING_OWNER_APPROVAL
-- Contracts 23-24: Property 4, TERMINATED
INSERT INTO lease_contracts (
    id, contract_number, tenant_id, unit_id, property_id, owner_id,
    start_date, end_date, signing_date,
    monthly_rent, security_deposit, payment_frequency, payment_day, currency,
    status, owner_approval_status, is_auto_renewable, renewal_notice_days,
    free_months, created_by, notes
) OVERRIDING SYSTEM VALUE VALUES
-- ===== Property 1 – ACTIVE =====
(1,  'CNT-2025-001', 1,  1,  1, 1, '2025-06-01','2026-05-31','2025-05-25', 3000.00, 6000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 2, 'عقد سكني — شقة 101 الطابق الأول'),
(2,  'CNT-2025-002', 2,  2,  1, 1, '2025-06-01','2026-05-31','2025-05-28', 3200.00, 6400.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 30, 0, 2, 'شقة مفروشة — تضمين مبلغ التأمين'),
(3,  'CNT-2025-003', 3,  3,  1, 1, '2025-06-01','2026-05-31','2025-05-20', 2200.00, 4400.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 2, 'عقد فردي بغرفة واحدة'),
(4,  'CNT-2025-004', 4,  4,  1, 1, '2025-06-01','2026-05-31','2025-05-22', 4500.00, 9000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 2, 'شقة 3 غرف — عائلة من 4 أفراد'),
(5,  'CNT-2025-005', 5,  5,  1, 1, '2025-06-01','2026-05-31','2025-05-18', 3500.00, 7000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 30, 1, 2, 'شقة مفروشة — شهر مجاني عند التعاقد'),
(6,  'CNT-2025-006', 6,  6,  1, 1, '2025-06-01','2026-05-31','2025-05-30', 1500.00, 3000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 2, 'استوديو — طالبة جامعية'),
-- ===== Property 2 – ACTIVE =====
(7,  'CNT-2025-007', 7,  7,  2, 2, '2025-07-01','2026-06-30','2025-06-20', 2500.00, 5000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 30, 0, 3, 'محل تجاري — بوتيك ملابس'),
(8,  'CNT-2025-008', 8,  8,  2, 2, '2025-07-01','2026-06-30','2025-06-22', 3200.00, 6400.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 3, 'محل إلكترونيات — موقع زاوية مميز'),
(9,  'CNT-2025-009', 9,  9,  2, 2, '2025-07-01','2026-06-30','2025-06-25', 4000.00, 8000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 60, 0, 3, 'مكتب محاماة — رغبة في تجديد 5 سنوات'),
(10, 'CNT-2025-010', 10,10,  2, 2, '2025-07-01','2026-06-30','2025-06-18', 5000.00,10000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 3, 'مكتب استشارات هندسية'),
(11, 'CNT-2025-011', 11,11,  2, 2, '2025-07-01','2026-06-30','2025-06-15', 6000.00,12000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 3, 'شركة تصميم داخلي — مكتب كبير'),
(12, 'CNT-2025-012', 12,12,  2, 2, '2025-07-01','2026-06-30','2025-06-28', 3750.00, 7500.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 30, 0, 3, 'شركة تقنية ناشئة'),
-- ===== Property 3 – ACTIVE =====
(13, 'CNT-2025-013', 13,13,  3, 3, '2025-08-01','2026-07-31','2025-07-20', 2000.00, 4000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 4, 'محل بقالة يومية — مستأجر قديم'),
(14, 'CNT-2025-014', 14,14,  3, 3, '2025-08-01','2026-07-31','2025-07-22', 2800.00, 5600.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 4, 'شقة سكنية — موظفة حكومية'),
(15, 'CNT-2025-015', 15,15,  3, 3, '2025-08-01','2026-07-31','2025-07-25', 2500.00, 5000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 4, 'مهندس أرامكو'),
(16, 'CNT-2025-016', 16,16,  3, 3, '2025-08-01','2026-07-31','2025-07-18', 3000.00, 6000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 30, 0, 4, 'شقة مفروشة — موظفة قطاع خاص'),
(17, 'CNT-2025-017', 17,17,  3, 3, '2025-08-01','2026-07-31','2025-07-15', 2700.00, 5400.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 4, 'عائلة من 3 أفراد'),
(18, 'CNT-2025-018', 18,18,  3, 3, '2025-08-01','2026-07-31','2025-07-28', 3200.00, 6400.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',TRUE, 30, 0, 4, 'مكتب خدمات ترجمة'),
-- ===== Property 4 – 2 ACTIVE =====
(19, 'CNT-2025-019', 19,19,  4, 4, '2025-09-01','2026-08-31','2025-08-20', 1500.00, 3000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 5, 'استوديو — طالبة دراسات عليا'),
(20, 'CNT-2025-020', 20,20,  4, 4, '2025-09-01','2026-08-31','2025-08-25', 2000.00, 4000.00,  'MONTHLY',1,'SAR','ACTIVE','APPROVED',FALSE,30, 0, 5, 'موظف بنكي ملتزم'),
-- ===== Property 4 – PENDING_OWNER_APPROVAL =====
(21, 'CNT-2026-021', 21,21,  4, 4, '2026-06-01','2027-05-31','2026-05-15', 2800.00, 5600.00,  'MONTHLY',1,'SAR','PENDING_OWNER_APPROVAL','PENDING',FALSE,30, 0, 5, 'عقد جديد قيد الموافقة — شقة 103 طابق أول'),
(22, 'CNT-2026-022', 22,22,  4, 4, '2026-06-01','2027-05-31','2026-05-18', 4000.00, 8000.00,  'MONTHLY',1,'SAR','PENDING_OWNER_APPROVAL','PENDING',FALSE,30, 0, 5, 'عقد جديد قيد الموافقة — شقة 201 طابق ثاني'),
-- ===== Property 4 – TERMINATED =====
(23, 'CNT-2024-023', 23,23,  4, 4, '2024-06-01','2025-05-31','2024-05-28', 8000.00,16000.00,  'MONTHLY',1,'SAR','TERMINATED',NULL,       FALSE,30, 0, 5, 'فيلا دوبلكس — إنهاء مبكر بسبب التعثر في السداد'),
(24, 'CNT-2024-024', 24,24,  4, 4, '2024-06-01','2025-05-31','2024-05-20', 2900.00, 5800.00,  'MONTHLY',1,'SAR','TERMINATED',NULL,       FALSE,30, 0, 5, 'إنهاء طبيعي بانتهاء المدة — طلب المستأجر عدم التجديد');

SELECT setval('lease_contracts_id_seq', 24);

-- Mark terminated units as not rented
UPDATE units SET is_rented = FALSE WHERE id IN (21,22,23,24);

-- ============================================================
-- STEP 15: RENT PAYMENT SCHEDULE
-- (3 months per active contract: Mar, Apr, May 2026)
-- Contracts 1-20 are active; 21-22 are pending; 23-24 are terminated
-- ============================================================
INSERT INTO rent_payment_schedule (id, contract_id, due_date, amount, period_from, period_to, status)
OVERRIDING SYSTEM VALUE VALUES
-- Contract 1 (Tenant 1 – good payer)
(1,  1,  '2026-03-01', 3000.00, '2026-03-01','2026-03-31','PAID'),
(2,  1,  '2026-04-01', 3000.00, '2026-04-01','2026-04-30','PAID'),
(3,  1,  '2026-05-01', 3000.00, '2026-05-01','2026-05-31','PENDING_CONFIRMATION'),
-- Contract 2 (Tenant 2 – good payer)
(4,  2,  '2026-03-01', 3200.00, '2026-03-01','2026-03-31','PAID'),
(5,  2,  '2026-04-01', 3200.00, '2026-04-01','2026-04-30','PAID'),
(6,  2,  '2026-05-01', 3200.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 3 (Tenant 3 – good payer)
(7,  3,  '2026-03-01', 2200.00, '2026-03-01','2026-03-31','PAID'),
(8,  3,  '2026-04-01', 2200.00, '2026-04-01','2026-04-30','PAID'),
(9,  3,  '2026-05-01', 2200.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 4 (Tenant 4 – OVERDUE!)
(10, 4,  '2026-03-01', 4500.00, '2026-03-01','2026-03-31','OVERDUE'),
(11, 4,  '2026-04-01', 4500.00, '2026-04-01','2026-04-30','OVERDUE'),
(12, 4,  '2026-05-01', 4500.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 5 (Tenant 5 – good payer)
(13, 5,  '2026-03-01', 3500.00, '2026-03-01','2026-03-31','PAID'),
(14, 5,  '2026-04-01', 3500.00, '2026-04-01','2026-04-30','PAID'),
(15, 5,  '2026-05-01', 3500.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 6 (Tenant 6 – good payer)
(16, 6,  '2026-03-01', 1500.00, '2026-03-01','2026-03-31','PAID'),
(17, 6,  '2026-04-01', 1500.00, '2026-04-01','2026-04-30','PAID'),
(18, 6,  '2026-05-01', 1500.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 7 (Tenant 7 – good payer)
(19, 7,  '2026-03-01', 2500.00, '2026-03-01','2026-03-31','PAID'),
(20, 7,  '2026-04-01', 2500.00, '2026-04-01','2026-04-30','PAID'),
(21, 7,  '2026-05-01', 2500.00, '2026-05-01','2026-05-31','PENDING_CONFIRMATION'),
-- Contract 8 (Tenant 8 – good payer)
(22, 8,  '2026-03-01', 3200.00, '2026-03-01','2026-03-31','PAID'),
(23, 8,  '2026-04-01', 3200.00, '2026-04-01','2026-04-30','PAID'),
(24, 8,  '2026-05-01', 3200.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 9 (Tenant 9 – good payer)
(25, 9,  '2026-03-01', 4000.00, '2026-03-01','2026-03-31','PAID'),
(26, 9,  '2026-04-01', 4000.00, '2026-04-01','2026-04-30','PAID'),
(27, 9,  '2026-05-01', 4000.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 10 (Tenant 10 – good payer)
(28,10,  '2026-03-01', 5000.00, '2026-03-01','2026-03-31','PAID'),
(29,10,  '2026-04-01', 5000.00, '2026-04-01','2026-04-30','PAID'),
(30,10,  '2026-05-01', 5000.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 11 (Tenant 11 – OVERDUE!)
(31,11,  '2026-03-01', 6000.00, '2026-03-01','2026-03-31','OVERDUE'),
(32,11,  '2026-04-01', 6000.00, '2026-04-01','2026-04-30','OVERDUE'),
(33,11,  '2026-05-01', 6000.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 12 (Tenant 12 – good payer)
(34,12,  '2026-03-01', 3750.00, '2026-03-01','2026-03-31','PAID'),
(35,12,  '2026-04-01', 3750.00, '2026-04-01','2026-04-30','PAID'),
(36,12,  '2026-05-01', 3750.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 13 (Tenant 13 – good payer)
(37,13,  '2026-03-01', 2000.00, '2026-03-01','2026-03-31','PAID'),
(38,13,  '2026-04-01', 2000.00, '2026-04-01','2026-04-30','PAID'),
(39,13,  '2026-05-01', 2000.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 14 (Tenant 14 – good payer)
(40,14,  '2026-03-01', 2800.00, '2026-03-01','2026-03-31','PAID'),
(41,14,  '2026-04-01', 2800.00, '2026-04-01','2026-04-30','PAID'),
(42,14,  '2026-05-01', 2800.00, '2026-05-01','2026-05-31','PENDING_CONFIRMATION'),
-- Contract 15 (Tenant 15 – good payer)
(43,15,  '2026-03-01', 2500.00, '2026-03-01','2026-03-31','PAID'),
(44,15,  '2026-04-01', 2500.00, '2026-04-01','2026-04-30','PAID'),
(45,15,  '2026-05-01', 2500.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 16 (Tenant 16 – OVERDUE!)
(46,16,  '2026-03-01', 3000.00, '2026-03-01','2026-03-31','OVERDUE'),
(47,16,  '2026-04-01', 3000.00, '2026-04-01','2026-04-30','OVERDUE'),
(48,16,  '2026-05-01', 3000.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 17 (Tenant 17 – good payer)
(49,17,  '2026-03-01', 2700.00, '2026-03-01','2026-03-31','PAID'),
(50,17,  '2026-04-01', 2700.00, '2026-04-01','2026-04-30','PAID'),
(51,17,  '2026-05-01', 2700.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 18 (Tenant 18 – good payer)
(52,18,  '2026-03-01', 3200.00, '2026-03-01','2026-03-31','PAID'),
(53,18,  '2026-04-01', 3200.00, '2026-04-01','2026-04-30','PAID'),
(54,18,  '2026-05-01', 3200.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 19 (Tenant 19 – good payer)
(55,19,  '2026-03-01', 1500.00, '2026-03-01','2026-03-31','PAID'),
(56,19,  '2026-04-01', 1500.00, '2026-04-01','2026-04-30','PAID'),
(57,19,  '2026-05-01', 1500.00, '2026-05-01','2026-05-31','PENDING'),
-- Contract 20 (Tenant 20 – good payer)
(58,20,  '2026-03-01', 2000.00, '2026-03-01','2026-03-31','PAID'),
(59,20,  '2026-04-01', 2000.00, '2026-04-01','2026-04-30','PAID'),
(60,20,  '2026-05-01', 2000.00, '2026-05-01','2026-05-31','PENDING');

SELECT setval('rent_payment_schedule_id_seq', 60);

-- Set proof data on PENDING_CONFIRMATION items (tenant submitted proof)
UPDATE rent_payment_schedule
SET proof_url              = 'https://placeholder.com/receipts/receipt-tenant1-may2026.pdf',
    proof_payment_method   = 'BANK_TRANSFER',
    proof_reference_number = 'TXN-20260501-0001',
    proof_notes            = 'تحويل بنكي — رقم العملية: TXN-20260501-0001',
    proof_submitted_by     = 13,
    proof_submitted_at     = '2026-05-02 09:15:00'
WHERE id = 3;

UPDATE rent_payment_schedule
SET proof_url              = 'https://placeholder.com/receipts/receipt-tenant7-may2026.pdf',
    proof_payment_method   = 'BANK_TRANSFER',
    proof_reference_number = 'TXN-20260501-0007',
    proof_notes            = 'تم التحويل في 1 مايو 2026',
    proof_submitted_by     = 14,
    proof_submitted_at     = '2026-05-01 11:30:00'
WHERE id = 21;

UPDATE rent_payment_schedule
SET proof_url              = 'https://placeholder.com/receipts/receipt-tenant14-may2026.pdf',
    proof_payment_method   = 'CASH',
    proof_reference_number = 'CASH-20260503-0014',
    proof_notes            = 'سداد نقدي عند مكتب الإدارة',
    proof_submitted_by     = 15,
    proof_submitted_at     = '2026-05-03 14:00:00'
WHERE id = 42;

-- ============================================================
-- STEP 16: RENT PAYMENTS  (actual payment records for PAID schedules)
-- ============================================================
INSERT INTO rent_payments (id, schedule_id, contract_id, tenant_id, payment_date, amount_paid, amount_due, payment_method, reference_number, notes, recorded_by)
OVERRIDING SYSTEM VALUE VALUES
-- Contract 1 (Tenant 1)
(1,  1,  1,  1,  '2026-03-02', 3000.00, 3000.00, 'BANK_TRANSFER', 'TXN-2026030101', 'دفع إيجار مارس 2026',    6),
(2,  2,  1,  1,  '2026-04-01', 3000.00, 3000.00, 'BANK_TRANSFER', 'TXN-2026040101', 'دفع إيجار أبريل 2026',   6),
-- Contract 2 (Tenant 2)
(3,  4,  2,  2,  '2026-03-03', 3200.00, 3200.00, 'BANK_TRANSFER', 'TXN-2026030201', 'دفع إيجار مارس 2026',    6),
(4,  5,  2,  2,  '2026-04-02', 3200.00, 3200.00, 'BANK_TRANSFER', 'TXN-2026040201', 'دفع إيجار أبريل 2026',   6),
-- Contract 3 (Tenant 3)
(5,  7,  3,  3,  '2026-03-01', 2200.00, 2200.00, 'CASH',          'CASH-030301',    'دفع نقدي مارس 2026',     2),
(6,  8,  3,  3,  '2026-04-01', 2200.00, 2200.00, 'CASH',          'CASH-030401',    'دفع نقدي أبريل 2026',    2),
-- Contract 5 (Tenant 5)
(7,  13, 5,  5,  '2026-03-05', 3500.00, 3500.00, 'ONLINE',        'ONL-2026030501', 'دفع إلكتروني مارس 2026', 6),
(8,  14, 5,  5,  '2026-04-05', 3500.00, 3500.00, 'ONLINE',        'ONL-2026040501', 'دفع إلكتروني أبريل 2026',6),
-- Contract 6 (Tenant 6)
(9,  16, 6,  6,  '2026-03-01', 1500.00, 1500.00, 'BANK_TRANSFER', 'TXN-2026030601', 'تحويل مارس 2026',        6),
(10, 17, 6,  6,  '2026-04-01', 1500.00, 1500.00, 'BANK_TRANSFER', 'TXN-2026040601', 'تحويل أبريل 2026',       6),
-- Contract 7 (Tenant 7 – Sara)
(11, 19, 7,  7,  '2026-03-01', 2500.00, 2500.00, 'BANK_TRANSFER', 'TXN-2026030701', 'دفع إيجار مارس 2026',    6),
(12, 20, 7,  7,  '2026-04-01', 2500.00, 2500.00, 'BANK_TRANSFER', 'TXN-2026040701', 'دفع إيجار أبريل 2026',   6),
-- Contract 8 (Tenant 8)
(13, 22, 8,  8,  '2026-03-02', 3200.00, 3200.00, 'CHECK',         'CHK-2026030801', 'شيك مارس 2026',           3),
(14, 23, 8,  8,  '2026-04-02', 3200.00, 3200.00, 'CHECK',         'CHK-2026040801', 'شيك أبريل 2026',          3),
-- Contract 9 (Tenant 9)
(15, 25, 9,  9,  '2026-03-01', 4000.00, 4000.00, 'BANK_TRANSFER', 'TXN-2026030901', 'تحويل بنكي مارس 2026',   6),
(16, 26, 9,  9,  '2026-04-01', 4000.00, 4000.00, 'BANK_TRANSFER', 'TXN-2026040901', 'تحويل بنكي أبريل 2026',  6),
-- Contract 10 (Tenant 10)
(17, 28, 10, 10, '2026-03-01', 5000.00, 5000.00, 'BANK_TRANSFER', 'TXN-2026031001', 'تحويل مارس 2026',         6),
(18, 29, 10, 10, '2026-04-01', 5000.00, 5000.00, 'BANK_TRANSFER', 'TXN-2026041001', 'تحويل أبريل 2026',        6),
-- Contract 12 (Tenant 12)
(19, 34, 12, 12, '2026-03-03', 3750.00, 3750.00, 'ONLINE',        'ONL-2026031201', 'دفع إلكتروني مارس 2026', 6),
(20, 35, 12, 12, '2026-04-03', 3750.00, 3750.00, 'ONLINE',        'ONL-2026041201', 'دفع إلكتروني أبريل 2026',6),
-- Contract 13 (Tenant 13 – Ali)
(21, 37, 13, 13, '2026-03-01', 2000.00, 2000.00, 'CASH',          'CASH-131301',    'نقدي مارس 2026',          4),
(22, 38, 13, 13, '2026-04-01', 2000.00, 2000.00, 'CASH',          'CASH-131401',    'نقدي أبريل 2026',         4),
-- Contract 14 (Tenant 14)
(23, 40, 14, 14, '2026-03-02', 2800.00, 2800.00, 'BANK_TRANSFER', 'TXN-2026031401', 'تحويل مارس 2026',         6),
(24, 41, 14, 14, '2026-04-02', 2800.00, 2800.00, 'BANK_TRANSFER', 'TXN-2026041401', 'تحويل أبريل 2026',        6),
-- Contract 15 (Tenant 15)
(25, 43, 15, 15, '2026-03-01', 2500.00, 2500.00, 'BANK_TRANSFER', 'TXN-2026031501', 'تحويل مارس 2026',         4),
(26, 44, 15, 15, '2026-04-01', 2500.00, 2500.00, 'BANK_TRANSFER', 'TXN-2026041501', 'تحويل أبريل 2026',        4),
-- Contract 17 (Tenant 17)
(27, 49, 17, 17, '2026-03-01', 2700.00, 2700.00, 'CASH',          'CASH-171701',    'نقدي مارس 2026',          4),
(28, 50, 17, 17, '2026-04-01', 2700.00, 2700.00, 'CASH',          'CASH-171801',    'نقدي أبريل 2026',         4),
-- Contract 18 (Tenant 18)
(29, 52, 18, 18, '2026-03-03', 3200.00, 3200.00, 'ONLINE',        'ONL-2026031801', 'دفع إلكتروني مارس 2026', 6),
(30, 53, 18, 18, '2026-04-03', 3200.00, 3200.00, 'ONLINE',        'ONL-2026041801', 'دفع إلكتروني أبريل 2026',6),
-- Contract 19 (Tenant 19 – Nora)
(31, 55, 19, 19, '2026-03-01', 1500.00, 1500.00, 'BANK_TRANSFER', 'TXN-2026031901', 'تحويل مارس 2026',         5),
(32, 56, 19, 19, '2026-04-01', 1500.00, 1500.00, 'BANK_TRANSFER', 'TXN-2026041901', 'تحويل أبريل 2026',        5),
-- Contract 20 (Tenant 20)
(33, 58, 20, 20, '2026-03-02', 2000.00, 2000.00, 'BANK_TRANSFER', 'TXN-2026032001', 'تحويل مارس 2026',         5),
(34, 59, 20, 20, '2026-04-02', 2000.00, 2000.00, 'BANK_TRANSFER', 'TXN-2026042001', 'تحويل أبريل 2026',        5);

SELECT setval('rent_payments_id_seq', 34);

-- ============================================================
-- STEP 17: MAINTENANCE REQUESTS  (8 requests — 2 per property)
-- ============================================================
INSERT INTO maintenance_requests (
    id, request_number, tenant_id, unit_id, property_id, category_id,
    title, description, priority, status, assigned_to,
    scheduled_date, scheduled_time_from, scheduled_time_to, closed_at
) OVERRIDING SYSTEM VALUE VALUES
-- Property 1
(1, 'MR-2025-001', 1,  1,  1, 1,
    'تسرب مياه في الحمام',
    'يوجد تسرب في أنبوب الصرف تحت الحوض مما يتسبب في تجمع المياه على الأرضية، الحالة تحتاج إصلاحاً عاجلاً',
    'HIGH', 'COMPLETED', 7,
    '2026-04-10', '09:00', '12:00', '2026-04-10 11:45:00'),
(2, 'MR-2025-002', 3,  3,  1, 2,
    'خلل في قاطع الكهرباء الرئيسي',
    'انقطع التيار الكهربائي عن غرفة النوم — القاطع الرئيسي يقطع بشكل متكرر عند تشغيل المكيف',
    'URGENT','IN_PROGRESS', 7,
    '2026-05-20','10:00','13:00', NULL),
-- Property 2
(3, 'MR-2025-003', 7,  7,  2, 3,
    'عطل في وحدة التكييف المركزي',
    'لا يعمل التكييف في المحل منذ يومين — المكيف يشتغل لكن لا يبرد، يبدو أن فريون منخفض',
    'HIGH','PENDING', NULL,
    NULL, NULL, NULL, NULL),
(4, 'MR-2025-004', 9,  9,  2, 6,
    'تشقق في سقف المكتب',
    'ظهرت تشققات في سقف المكتب عند الجدار الشمالي وبدأت بعض قطع الجبس بالسقوط',
    'NORMAL','ASSIGNED', 7,
    '2026-05-22','08:00','11:00', NULL),
-- Property 3
(5, 'MR-2025-005', 13, 13, 3, 5,
    'إعادة دهان الواجهة الداخلية للمحل',
    'الدهان القديم بدأ بالتقشر في عدة أماكن — المستأجر يطلب دهاناً جديداً بلون فاتح',
    'LOW','COMPLETED', 8,
    '2026-03-15','08:00','15:00', '2026-03-15 14:30:00'),
(6, 'MR-2025-006', 15, 15, 3, 1,
    'انخفاض ضغط المياه في المطبخ',
    'ضغط الماء منخفض جداً في صنبور المطبخ حتى في أوقات غير الذروة — يشتبه بانسداد في التمديدات',
    'NORMAL','PENDING', NULL,
    NULL, NULL, NULL, NULL),
-- Property 4
(7, 'MR-2025-007', 19, 19, 4, 2,
    'مصباح قاعة المدخل معطل',
    'مصباح قاعة المدخل الرئيسي في الاستوديو لا يضيء — تم استبدال المصباح لكن المشكلة مستمرة',
    'LOW','IN_PROGRESS', 8,
    '2026-05-19','14:00','16:00', NULL),
(8, 'MR-2025-008', 22, 22, 4, 3,
    'صوت غريب في وحدة التكييف',
    'وحدة التكييف في غرفة النوم الرئيسية تصدر صوتاً اهتزازياً عالياً عند التشغيل — يحتاج فحصاً وصيانة',
    'NORMAL','SCHEDULED', 7,
    '2026-05-25','09:00','12:00', NULL);

SELECT setval('maintenance_requests_id_seq', 8);

-- ============================================================
-- STEP 18: NOTIFICATIONS  (various types covering all modules)
-- ============================================================
INSERT INTO notifications (id, recipient_user_id, actor_user_id, property_id, request_id, type, title, message, is_read, channel, related_entity, related_id, created_at)
OVERRIDING SYSTEM VALUE VALUES
-- Accountant notified of rent payments received
(1,  6, 13, 1, NULL, 'RENT_PAYMENT_RECEIVED',
    'تم استلام الإيجار',
    'تم استلام دفعة الإيجار من المستأجر رامي السليمان — الوحدة 101 برج الياسمين — مبلغ 3,000 ريال',
    FALSE, 'IN_APP', 'rent_payment', 1, '2026-03-02 10:00:00'),

(2,  6, 13, 1, NULL, 'RENT_PAYMENT_RECEIVED',
    'تم استلام الإيجار',
    'تم استلام دفعة الإيجار من المستأجر رامي السليمان — الوحدة 101 برج الياسمين — مبلغ 3,000 ريال',
    TRUE,  'IN_APP', 'rent_payment', 2, '2026-04-01 09:30:00'),

(3,  6, 14, 2, NULL, 'RENT_PAYMENT_RECEIVED',
    'تم استلام الإيجار',
    'تم استلام دفعة الإيجار من المستأجرة سارة الهاشم — الوحدة 101 مركز الأعمال — مبلغ 2,500 ريال',
    TRUE,  'IN_APP', 'rent_payment', 11, '2026-03-01 11:00:00'),

-- Accountant notified of proof submitted (pending confirmation)
(4,  6, 13, 1, NULL, 'PAYMENT_PROOF_SUBMITTED',
    'إيصال دفع في انتظار التأكيد',
    'المستأجر رامي السليمان رفع إيصال دفع إيجار مايو 2026 — الوحدة 101 برج الياسمين — بانتظار المراجعة والتأكيد',
    FALSE, 'IN_APP', 'rent_payment_schedule', 3, '2026-05-02 09:20:00'),

(5,  6, 14, 2, NULL, 'PAYMENT_PROOF_SUBMITTED',
    'إيصال دفع في انتظار التأكيد',
    'المستأجرة سارة الهاشم رفعت إيصال دفع إيجار مايو 2026 — الوحدة 101 مركز الأعمال — بانتظار المراجعة',
    FALSE, 'IN_APP', 'rent_payment_schedule', 21, '2026-05-01 11:45:00'),

-- Owner notified of contracts pending approval
(6,  12, 5, 4, NULL, 'CONTRACT_PENDING_OWNER_APPROVAL',
    'عقد إيجار جديد يحتاج موافقتك',
    'تم إنشاء عقد إيجار جديد للوحدة 103 في برج الأفق للمستأجرة رهف الزهراني — بانتظار موافقتك على العقد رقم CNT-2026-021',
    FALSE, 'IN_APP', 'lease_contract', 21, '2026-05-15 14:00:00'),

(7,  12, 5, 4, NULL, 'CONTRACT_PENDING_OWNER_APPROVAL',
    'عقد إيجار جديد يحتاج موافقتك',
    'تم إنشاء عقد إيجار جديد للوحدة 201 في برج الأفق للمستأجر مروان الثقفي — بانتظار موافقتك على العقد رقم CNT-2026-022',
    FALSE, 'IN_APP', 'lease_contract', 22, '2026-05-18 10:30:00'),

-- Tenant notified when contract was activated
(8,  13, 2, 1, NULL, 'CONTRACT_ACTIVATED',
    'تم تفعيل عقد الإيجار',
    'مرحباً رامي، تم تفعيل عقد إيجارك للوحدة 101 في برج الياسمين بدءاً من 1 يونيو 2025. يسعدنا استقبالك',
    TRUE, 'IN_APP', 'lease_contract', 1, '2025-06-01 08:00:00'),

(9,  14, 3, 2, NULL, 'CONTRACT_ACTIVATED',
    'تم تفعيل عقد الإيجار',
    'مرحباً سارة، تم تفعيل عقد إيجارك للوحدة 101 في مركز الأعمال بدءاً من 1 يوليو 2025. أهلاً وسهلاً بك',
    TRUE, 'IN_APP', 'lease_contract', 7, '2025-07-01 08:00:00'),

-- Tenant notified of overdue rent
(10, 13, 6, 1, NULL, 'RENT_OVERDUE',
    'تنبيه: تأخر في سداد الإيجار',
    'عزيزنا رامي، تذكير بأن دفعة إيجار مارس 2026 للوحدة 101 برج الياسمين قد تأخرت. الرجاء التواصل مع الإدارة',
    TRUE,  'IN_APP', 'rent_payment_schedule', 10, '2026-03-10 09:00:00'),

-- Maintenance officer notified of new requests
(11, 7, 13, 1, 1, 'MAINTENANCE_REQUEST_SUBMITTED',
    'طلب صيانة جديد',
    'تم استلام طلب صيانة جديد MR-2025-001 من الوحدة 101 برج الياسمين: تسرب مياه في الحمام — الأولوية عالية',
    TRUE,  'IN_APP', 'maintenance_request', 1, '2026-04-05 10:30:00'),

(12, 7, 15, 2, 4, 'MAINTENANCE_REQUEST_SUBMITTED',
    'طلب صيانة جديد',
    'تم استلام طلب صيانة MR-2025-004 من الوحدة 103 مركز الأعمال: تشقق في سقف المكتب — الأولوية عادية',
    FALSE, 'IN_APP', 'maintenance_request', 4, '2026-05-10 14:15:00'),

(13, 8, 15, 3, 5, 'MAINTENANCE_REQUEST_SUBMITTED',
    'طلب صيانة جديد',
    'تم استلام طلب صيانة MR-2025-005 من الوحدة 101 مجمع النخيل: إعادة دهان الواجهة — الأولوية منخفضة',
    TRUE,  'IN_APP', 'maintenance_request', 5, '2026-03-10 08:00:00'),

-- Tenant notified when maintenance is completed
(14, 13, 7, 1, 1, 'MAINTENANCE_REQUEST_COMPLETED',
    'تم إنجاز طلب الصيانة',
    'تم إتمام طلب الصيانة MR-2025-001 الخاص بتسرب المياه في وحدتك 101 برج الياسمين بنجاح',
    TRUE,  'IN_APP', 'maintenance_request', 1, '2026-04-10 12:00:00'),

(15, 15, 8, 3, 5, 'MAINTENANCE_REQUEST_COMPLETED',
    'تم إنجاز طلب الصيانة',
    'تم إتمام طلب الصيانة MR-2025-005 الخاص بدهان الواجهة في المحل 101 مجمع النخيل بنجاح',
    FALSE, 'IN_APP', 'maintenance_request', 5, '2026-03-15 15:00:00'),

-- Notification about terminated contract
(16, 5, NULL, 4, NULL, 'CONTRACT_TERMINATED',
    'تم إنهاء عقد إيجار',
    'تم إنهاء عقد الإيجار CNT-2024-023 للوحدة 202 (الفيلا) في برج الأفق بسبب التعثر في السداد',
    TRUE,  'IN_APP', 'lease_contract', 23, '2025-04-15 10:00:00'),

-- Accountant notified of overdue payments alert
(17, 6, NULL, 1, NULL, 'RENT_OVERDUE',
    'تنبيه: مستأجرون متأخرون في السداد',
    'تنبيه: 3 مستأجرين تأخروا في سداد إيجار مارس وأبريل 2026: نورة الرشيدي (شقة 201)، ريم الشهراني (مكتب 202)، أميرة البيشي (شقة 201)',
    FALSE, 'IN_APP', NULL, NULL, '2026-04-15 08:00:00'),

-- Admin Jasmine notified of new contract activity
(18, 2, NULL, 1, NULL, 'SYSTEM_ALERT',
    'تنبيه: عقود إيجار جديدة مفعلة',
    'تم تفعيل 6 عقود إيجار جديدة للوحدات 101-203 في الطابقين الأول والثاني ببرج الياسمين بحالة نشطة',
    TRUE,  'IN_APP', 'property', 1, '2025-06-01 09:00:00');

SELECT setval('notifications_id_seq', 18);

-- ============================================================
-- STEP 19: CODE GENERATION STATE  (sync counters so new codes don't collide)
-- ============================================================
INSERT INTO code_generation_state (code_type, year, last_number) VALUES
('PROPERTY', 2026, 4),
('UNIT',     2026, 24),
('OWN',      2026, 4),
('TEN',      2026, 24),
('EMP',      2026, 5),
('MR',       2025, 8),
('CNT',      2025, 24),
('MR',       2026, 0),
('CNT',      2026, 0)
ON CONFLICT (code_type, year) DO UPDATE SET last_number = EXCLUDED.last_number;

-- ============================================================
-- STEP 20: UPDATE unit totals on properties
-- ============================================================
UPDATE properties SET total_units = 6 WHERE id IN (1,2,3,4);
