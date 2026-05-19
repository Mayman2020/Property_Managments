-- V153: Full demo data seed – Finance, HR/Payroll, Inventory, Vacancies, Complaints, Ratings
-- Covers all previously empty screens: finance workspace, HR payroll, inventory, vacancies, ratings

-- ============================================================
-- STEP 1: FINANCIAL PERIODS (2026 annual open period per property)
-- ============================================================
INSERT INTO financial_periods (id, property_id, period_name, period_type, start_date, end_date, status)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'السنة المالية 2026 - برج الياسمين',    'ANNUAL', '2026-01-01', '2026-12-31', 'OPEN'),
(2, 2, 'السنة المالية 2026 - مركز الأعمال',     'ANNUAL', '2026-01-01', '2026-12-31', 'OPEN'),
(3, 3, 'السنة المالية 2026 - مجمع النخيل',      'ANNUAL', '2026-01-01', '2026-12-31', 'OPEN'),
(4, 4, 'السنة المالية 2026 - برج الأفق الزجاجي','ANNUAL', '2026-01-01', '2026-12-31', 'OPEN')
ON CONFLICT (id) DO NOTHING;
SELECT setval('financial_periods_id_seq', 4, true);

-- ============================================================
-- STEP 2: BUDGETS (per property per category)
-- ============================================================
INSERT INTO budgets (id, property_id, financial_period_id, category_id, budgeted_amount)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 (برج الياسمين)
(1,  1, 1, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),   24000.00),
(2,  1, 1, (SELECT id FROM expense_categories WHERE category_code='CLEAN-SERVICE'),12000.00),
(3,  1, 1, (SELECT id FROM expense_categories WHERE category_code='MAINT-SPARE'), 18000.00),
(4,  1, 1, (SELECT id FROM expense_categories WHERE category_code='ADMIN-INSUR'), 15000.00),
(5,  1, 1, (SELECT id FROM expense_categories WHERE category_code='PAY-SALARY'),  90000.00),
-- Property 2 (مركز الأعمال)
(6,  2, 2, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),   36000.00),
(7,  2, 2, (SELECT id FROM expense_categories WHERE category_code='CLEAN-SERVICE'),18000.00),
(8,  2, 2, (SELECT id FROM expense_categories WHERE category_code='MAINT-AC'),    24000.00),
(9,  2, 2, (SELECT id FROM expense_categories WHERE category_code='ADMIN-INSUR'), 20000.00),
(10, 2, 2, (SELECT id FROM expense_categories WHERE category_code='PAY-SALARY'),  60000.00),
-- Property 3 (مجمع النخيل)
(11, 3, 3, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),   30000.00),
(12, 3, 3, (SELECT id FROM expense_categories WHERE category_code='MAINT-ELEV'),  12000.00),
(13, 3, 3, (SELECT id FROM expense_categories WHERE category_code='MAINT-FIRE'),   8000.00),
(14, 3, 3, (SELECT id FROM expense_categories WHERE category_code='ADMIN-LICENSE'),6000.00),
(15, 3, 3, (SELECT id FROM expense_categories WHERE category_code='PAY-SALARY'),  66000.00),
-- Property 4 (برج الأفق)
(16, 4, 4, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),   28000.00),
(17, 4, 4, (SELECT id FROM expense_categories WHERE category_code='CLEAN-SERVICE'),15000.00),
(18, 4, 4, (SELECT id FROM expense_categories WHERE category_code='MAINT-SPARE'), 20000.00),
(19, 4, 4, (SELECT id FROM expense_categories WHERE category_code='ADMIN-INSUR'), 18000.00)
ON CONFLICT DO NOTHING;
SELECT setval('budgets_id_seq', 19, true);

-- ============================================================
-- STEP 3: EXPENSES (3 per property = 12 total, mix of PAID/PENDING)
-- ============================================================
INSERT INTO expenses (id, expense_number, property_id, category_id, description, amount, currency, expense_date, payment_method, status, submitted_by)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 (برج الياسمين) – Manager user_id=2
(1,  'EXP-2026-001', 1, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),
     'فاتورة الكهرباء المشتركة - أبريل 2026',  1850.00, 'SAR', '2026-04-05', 'BANK_TRANSFER', 'PAID',    2),
(2,  'EXP-2026-002', 1, (SELECT id FROM expense_categories WHERE category_code='CLEAN-SERVICE'),
     'خدمة تنظيف البرج الشهرية - أبريل',       900.00,  'SAR', '2026-04-10', 'CASH',          'PAID',    2),
(3,  'EXP-2026-003', 1, (SELECT id FROM expense_categories WHERE category_code='MAINT-SPARE'),
     'قطع غيار مضخة المياه - طارئة',            1200.00, 'SAR', '2026-05-02', 'CASH',          'PENDING', 2),
-- Property 2 (مركز الأعمال) – Manager user_id=3
(4,  'EXP-2026-004', 2, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),
     'فاتورة الكهرباء المشتركة - أبريل 2026',  3100.00, 'SAR', '2026-04-05', 'BANK_TRANSFER', 'PAID',    3),
(5,  'EXP-2026-005', 2, (SELECT id FROM expense_categories WHERE category_code='MAINT-AC'),
     'صيانة دورية لأجهزة التكييف المركزي',     2400.00, 'SAR', '2026-04-15', 'BANK_TRANSFER', 'PAID',    3),
(6,  'EXP-2026-006', 2, (SELECT id FROM expense_categories WHERE category_code='ADMIN-INSUR'),
     'تجديد تأمين المبنى السنوي',              8500.00, 'SAR', '2026-05-01', 'CHECK',         'PENDING', 3),
-- Property 3 (مجمع النخيل) – Manager user_id=4
(7,  'EXP-2026-007', 3, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),
     'فاتورة الكهرباء المشتركة - أبريل 2026',  2600.00, 'SAR', '2026-04-05', 'BANK_TRANSFER', 'PAID',    4),
(8,  'EXP-2026-008', 3, (SELECT id FROM expense_categories WHERE category_code='MAINT-ELEV'),
     'صيانة المصعد الشهرية وفحص السلامة',      1800.00, 'SAR', '2026-04-20', 'BANK_TRANSFER', 'PAID',    4),
(9,  'EXP-2026-009', 3, (SELECT id FROM expense_categories WHERE category_code='ADMIN-LICENSE'),
     'تجديد رخصة البلدية للمجمع',              1500.00, 'SAR', '2026-05-10', 'BANK_TRANSFER', 'PENDING', 4),
-- Property 4 (برج الأفق الزجاجي) – Manager user_id=5
(10, 'EXP-2026-010', 4, (SELECT id FROM expense_categories WHERE category_code='UTIL-ELEC'),
     'فاتورة الكهرباء المشتركة - أبريل 2026',  2200.00, 'SAR', '2026-04-05', 'BANK_TRANSFER', 'PAID',    5),
(11, 'EXP-2026-011', 4, (SELECT id FROM expense_categories WHERE category_code='CLEAN-SERVICE'),
     'شركة النظافة الخارجية - أبريل 2026',    1100.00, 'SAR', '2026-04-12', 'CASH',          'PAID',    5),
(12, 'EXP-2026-012', 4, (SELECT id FROM expense_categories WHERE category_code='MAINT-FIRE'),
     'فحص سنوي لأنظمة إطفاء الحريق',          3200.00, 'SAR', '2026-05-05', 'BANK_TRANSFER', 'PENDING', 5)
ON CONFLICT (expense_number) DO NOTHING;
SELECT setval('expenses_id_seq', 12, true);

-- ============================================================
-- STEP 4: OTHER REVENUES (non-rent revenues per property)
-- ============================================================
INSERT INTO other_revenues (id, revenue_number, property_id, category_id, description, amount, currency, revenue_date, payment_method, recorded_by)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1
(1,  'REV-2026-001', 1, (SELECT id FROM revenue_categories WHERE category_code='REV-PARKING'),
     'رسوم مواقف السيارات - أبريل 2026',    600.00,  'SAR', '2026-04-30', 'CASH',          2),
(2,  'REV-2026-002', 1, (SELECT id FROM revenue_categories WHERE category_code='REV-FINE'),
     'غرامة تأخر السداد - المستأجر رقم 3',  250.00,  'SAR', '2026-05-05', 'BANK_TRANSFER', 2),
-- Property 2
(3,  'REV-2026-003', 2, (SELECT id FROM revenue_categories WHERE category_code='REV-SERVICE'),
     'رسوم خدمات مشتركة إضافية - أبريل',    420.00,  'SAR', '2026-04-30', 'BANK_TRANSFER', 3),
(4,  'REV-2026-004', 2, (SELECT id FROM revenue_categories WHERE category_code='REV-PARKING'),
     'رسوم مواقف السيارات التجارية - أبريل',1200.00, 'SAR', '2026-04-30', 'BANK_TRANSFER', 3),
(5,  'REV-2026-005', 2, (SELECT id FROM revenue_categories WHERE category_code='REV-FINE'),
     'غرامة مخالفة لوائح المبنى',           150.00,  'SAR', '2026-05-08', 'CASH',          3),
-- Property 3
(6,  'REV-2026-006', 3, (SELECT id FROM revenue_categories WHERE category_code='REV-PARKING'),
     'رسوم مواقف السيارات - أبريل 2026',    480.00,  'SAR', '2026-04-30', 'CASH',          4),
(7,  'REV-2026-007', 3, (SELECT id FROM revenue_categories WHERE category_code='REV-SERVICE'),
     'رسوم الوحدة التجارية - الطابق الأرضي', 800.00, 'SAR', '2026-04-30', 'BANK_TRANSFER', 4),
-- Property 4
(8,  'REV-2026-008', 4, (SELECT id FROM revenue_categories WHERE category_code='REV-PARKING'),
     'رسوم مواقف السيارات - أبريل 2026',    540.00,  'SAR', '2026-04-30', 'CASH',          5),
(9,  'REV-2026-009', 4, (SELECT id FROM revenue_categories WHERE category_code='REV-FINE'),
     'غرامة تأخر سداد إيجار',               300.00,  'SAR', '2026-05-10', 'BANK_TRANSFER', 5)
ON CONFLICT (revenue_number) DO NOTHING;
SELECT setval('other_revenues_id_seq', 9, true);

-- ============================================================
-- STEP 5: PAYROLL RUNS (April + May 2026)
-- Employees: 1=prop1, 2=prop3, 3=prop1, 4=prop2, 5=prop3
-- Run per property grouping:
--   Run 1 = prop1 employees (1,3), Run 2 = prop2 employees (4), Run 3 = prop3 employees (2,5)
-- ============================================================
INSERT INTO payroll_runs (id, property_id, pay_period_year, pay_period_month, pay_date, status,
    total_basic, total_allowances, total_deductions, total_bonuses, total_net, prepared_by)
OVERRIDING SYSTEM VALUE VALUES
-- April 2026 – Property 1 (emp 1 basic=6000, emp 3 basic=4000)
(1, 1, 2026, 4, '2026-04-30', 'PAID',     10000.00, 2100.00, 0.00, 0.00, 12100.00, 2),
-- April 2026 – Property 2 (emp 4 basic=7000)
(2, 2, 2026, 4, '2026-04-30', 'PAID',      7000.00, 1500.00, 0.00, 0.00,  8500.00, 3),
-- April 2026 – Property 3 (emp 2 basic=5500, emp 5 basic=2500)
(3, 3, 2026, 4, '2026-04-30', 'PAID',      8000.00, 1200.00, 0.00, 0.00,  9200.00, 4),
-- May 2026 – Property 1
(4, 1, 2026, 5, '2026-05-31', 'SUBMITTED', 10000.00, 2100.00, 0.00, 500.00,12600.00, 2),
-- May 2026 – Property 2
(5, 2, 2026, 5, '2026-05-31', 'SUBMITTED',  7000.00, 1500.00, 0.00, 0.00,  8500.00, 3),
-- May 2026 – Property 3
(6, 3, 2026, 5, '2026-05-31', 'SUBMITTED',  8000.00, 1200.00, 0.00, 0.00,  9200.00, 4)
ON CONFLICT (property_id, pay_period_year, pay_period_month) DO NOTHING;
SELECT setval('payroll_runs_id_seq', 6, true);

-- ============================================================
-- STEP 6: PAYSLIPS (per employee per run)
-- housing_allowance ≈ 25% of basic, transport_allowance = 300 SAR
-- ============================================================
INSERT INTO payslips (id, payroll_run_id, employee_id,
    basic_salary, housing_allowance, transport_allowance, other_allowances,
    total_earnings, total_deductions, net_salary,
    is_paid, paid_date, payment_method)
OVERRIDING SYSTEM VALUE VALUES
-- April run (prop1) – Employee 1: Khalid (basic=6000)
(1,  1, 1, 6000.00, 1500.00, 300.00, 0.00, 7800.00, 0.00, 7800.00, TRUE,  '2026-04-30', 'BANK_TRANSFER'),
-- April run (prop1) – Employee 3: Mohammed (basic=4000)
(2,  1, 3, 4000.00,  900.00, 300.00, 0.00, 5200.00, 0.00, 5200.00, TRUE,  '2026-04-30', 'BANK_TRANSFER'),
-- April run (prop2) – Employee 4: Ahmed (basic=7000)
(3,  2, 4, 7000.00, 1500.00, 300.00, 0.00, 8800.00, 0.00, 8800.00, TRUE,  '2026-04-30', 'BANK_TRANSFER'),
-- April run (prop3) – Employee 2: Omar (basic=5500)
(4,  3, 2, 5500.00, 1375.00, 300.00, 0.00, 7175.00, 0.00, 7175.00, TRUE,  '2026-04-30', 'BANK_TRANSFER'),
-- April run (prop3) – Employee 5: Abdullah (basic=2500)
(5,  3, 5, 2500.00,  625.00, 300.00, 0.00, 3425.00, 0.00, 3425.00, TRUE,  '2026-04-30', 'BANK_TRANSFER'),
-- May run (prop1) – Employee 1 (bonus 500 SAR)
(6,  4, 1, 6000.00, 1500.00, 300.00, 0.00, 8300.00, 0.00, 8300.00, FALSE, NULL, NULL),
-- May run (prop1) – Employee 3
(7,  4, 3, 4000.00,  900.00, 300.00, 0.00, 5200.00, 0.00, 5200.00, FALSE, NULL, NULL),
-- May run (prop2) – Employee 4
(8,  5, 4, 7000.00, 1500.00, 300.00, 0.00, 8800.00, 0.00, 8800.00, FALSE, NULL, NULL),
-- May run (prop3) – Employee 2
(9,  6, 2, 5500.00, 1375.00, 300.00, 0.00, 7175.00, 0.00, 7175.00, FALSE, NULL, NULL),
-- May run (prop3) – Employee 5
(10, 6, 5, 2500.00,  625.00, 300.00, 0.00, 3425.00, 0.00, 3425.00, FALSE, NULL, NULL)
ON CONFLICT DO NOTHING;
SELECT setval('payslips_id_seq', 10, true);

-- ============================================================
-- STEP 7: LEAVE BALANCES (Annual + Sick per employee for 2026)
-- ============================================================
INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days)
OVERRIDING SYSTEM VALUE VALUES
-- Annual Leave (30 days by V122)
(1,  1, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'), 2026, 30, 5),
(2,  2, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'), 2026, 30, 0),
(3,  3, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'), 2026, 30, 10),
(4,  4, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'), 2026, 30, 0),
(5,  5, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'), 2026, 30, 3),
-- Sick Leave (10 days)
(6,  1, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'), 2026, 10, 2),
(7,  2, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'), 2026, 10, 0),
(8,  3, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'), 2026, 10, 0),
(9,  4, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'), 2026, 10, 1),
(10, 5, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'), 2026, 10, 0)
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
SELECT setval('leave_balances_id_seq', 10, true);

-- ============================================================
-- STEP 8: LEAVE REQUESTS (approved + pending)
-- ============================================================
INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, approved_by, approved_at)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'),
   '2026-02-15', '2026-02-19', 5, 'إجازة سنوية مستحقة', 'APPROVED', 2, '2026-02-10 10:00:00'),
(2, 3, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'),
   '2026-03-01', '2026-03-12', 10, 'إجازة مع الأسرة', 'APPROVED', 2, '2026-02-25 09:30:00'),
(3, 5, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'),
   '2026-04-10', '2026-04-12', 3, 'مرض - تعب ووعكة صحية', 'APPROVED', 4, '2026-04-10 08:00:00'),
(4, 4, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='sick leave'),
   '2026-05-14', '2026-05-14', 1, 'مراجعة طبية', 'PENDING', NULL, NULL),
(5, 2, (SELECT id FROM leave_types WHERE LOWER(COALESCE(type_name_en,''))='annual leave'),
   '2026-06-01', '2026-06-05', 5, 'إجازة صيفية', 'PENDING', NULL, NULL)
ON CONFLICT DO NOTHING;
SELECT setval('leave_requests_id_seq', 5, true);

-- ============================================================
-- STEP 9: INVENTORY ITEMS (3–4 per property)
-- ============================================================
INSERT INTO inventory_items (id, property_id, item_code, item_name_ar, item_name_en, unit_of_measure, quantity, min_quantity, location)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 (برج الياسمين)
(1,  1, 'INV-P1-001', 'مواد تنظيف ومنظفات',       'Cleaning supplies & detergents',  'كرتون', 15.00, 5.00,  'مستودع الدور الأرضي'),
(2,  1, 'INV-P1-002', 'مصابيح LED إضاءة مشتركة', 'LED bulbs – common areas',        'قطعة',  40.00, 10.00, 'مستودع الدور الأرضي'),
(3,  1, 'INV-P1-003', 'فلاتر تكييف استبدال',       'AC replacement filters',          'قطعة',  12.00, 4.00,  'غرفة الأجهزة'),
(4,  1, 'INV-P1-004', 'أدوات صيانة عامة',          'General maintenance tools set',   'طقم',   3.00,  1.00,  'ورشة الصيانة'),
-- Property 2 (مركز الأعمال)
(5,  2, 'INV-P2-001', 'ورق طابعات وأقلام مكتب',   'Printer paper & office stationery','رزمة', 30.00, 10.00, 'مكتب الإدارة'),
(6,  2, 'INV-P2-002', 'مواد تنظيف وتعقيم',         'Cleaning & disinfection materials','كرتون', 20.00, 6.00,  'مستودع B1'),
(7,  2, 'INV-P2-003', 'قطع غيار مضخة المياه',      'Water pump spare parts',          'قطعة',  8.00,  2.00,  'غرفة المضخات'),
(8,  2, 'INV-P2-004', 'بطاريات UPS احتياطية',      'UPS backup batteries',            'قطعة',  6.00,  2.00,  'غرفة الأجهزة الكهربائية'),
-- Property 3 (مجمع النخيل)
(9,  3, 'INV-P3-001', 'دهانات ومعجون جدران',       'Wall paint & filler',             'كيلو',  25.00, 8.00,  'مستودع الصيانة'),
(10, 3, 'INV-P3-002', 'مواد سباكة وتمديدات',       'Plumbing fittings & pipes',       'قطعة',  50.00, 15.00, 'مستودع الصيانة'),
(11, 3, 'INV-P3-003', 'مواد تنظيف حدائق',          'Garden & landscape supplies',     'كيس',   10.00, 3.00,  'مخزن الحديقة'),
-- Property 4 (برج الأفق)
(12, 4, 'INV-P4-001', 'مناشف وبياضات استقبال',     'Reception towels & linen',        'قطعة',  60.00, 20.00, 'مخزن الاستقبال'),
(13, 4, 'INV-P4-002', 'مواد تنظيف واجهات زجاجية', 'Glass facade cleaning materials', 'لتر',   18.00, 5.00,  'مستودع الدور الأرضي'),
(14, 4, 'INV-P4-003', 'قرطاسية ومستلزمات مكتبية', 'Office stationery & supplies',    'رزمة',  25.00, 8.00,  'مكتب الإدارة'),
(15, 4, 'INV-P4-004', 'مواد إطفاء حريق احتياطية', 'Fire safety backup materials',    'قطعة',  5.00,  2.00,  'غرفة الطوارئ')
ON CONFLICT (item_code) DO NOTHING;
SELECT setval('inventory_items_id_seq', 15, true);

-- ============================================================
-- STEP 10: VACANCY LISTINGS (units 23 + 24 from TERMINATED contracts)
-- unit_id=23 is unit 202 property 4, unit_id=24 is unit 203 property 4
-- ============================================================
INSERT INTO vacancy_listings (id, unit_id, property_id, title_ar, title_en, description_ar, asking_rent, currency, available_from, is_published, created_by)
OVERRIDING SYSTEM VALUE VALUES
(1, 23, 4,
 'شقة 202 للإيجار – برج الأفق الزجاجي',
 'Unit 202 For Rent – Al-Ufuq Glass Tower',
 'شقة فاخرة مطلة على المدينة، 3 غرف نوم، 2 حمام، مكيفات مركزية، موقف خاص. متاحة للسكن الفوري.',
 4200.00, 'SAR', '2026-06-01', TRUE, 5),
(2, 24, 4,
 'شقة 203 للإيجار – برج الأفق الزجاجي',
 'Unit 203 For Rent – Al-Ufuq Glass Tower',
 'شقة راقية مفروشة بالكامل، 2 غرف نوم، إطلالة بانورامية. تحتاج لتجديد بسيط.',
 3800.00, 'SAR', '2026-07-01', TRUE, 5)
ON CONFLICT (unit_id) DO NOTHING;
SELECT setval('vacancy_listings_id_seq', 2, true);

-- Rental inquiries for the vacancies
INSERT INTO rental_inquiries (id, listing_id, unit_id, property_id, inquirer_name, inquirer_phone, inquirer_email, inquirer_type, message, preferred_start, status, assigned_to)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 23, 4, 'فيصل محمد الشمري', '+966505551001', 'faisal.shamri@email.com', 'INDIVIDUAL',
   'أود الاستفسار عن موعد المعاينة وتفاصيل العقد', '2026-06-01', 'VIEWING_SCHEDULED', 5),
(2, 2, 24, 4, 'شركة التجارة الذهبية', '+966505552002', 'info@goldentrade.com', 'COMPANY',
   'نريد معاينة الشقة للاستخدام السكني لأحد مدرائنا', '2026-07-01', 'NEW', 5)
ON CONFLICT DO NOTHING;
SELECT setval('rental_inquiries_id_seq', 2, true);

-- ============================================================
-- STEP 11: TENANT COMPLAINTS (2 complaints with replies)
-- Tenants: tenant_id=1 (unit=1, prop=1), tenant_id=7 (unit=7, prop=2)
-- ============================================================
INSERT INTO tenant_complaints (id, tenant_id, unit_id, property_id, complaint_type, title, description, status, priority, assigned_to)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 1, 'NEIGHBOR_NOISE',
   'ضوضاء مرتفعة من الجيران في وقت متأخر من الليل',
   'يعاني من ضوضاء مستمرة من الشقة المجاورة (102) بعد منتصف الليل مما يؤثر على النوم والراحة اليومية.',
   'IN_REVIEW', 'HIGH', 2),
(2, 7, 7, 2, 'COMMON_AREA',
   'تلف في أرضية المدخل الرئيسي للمبنى',
   'يوجد كسر وتلف واضح في بلاط المدخل الرئيسي، وهو يشكل خطراً على السلامة ويؤثر على المظهر العام للمبنى.',
   'RESOLVED', 'NORMAL', 3)
ON CONFLICT DO NOTHING;
SELECT setval('tenant_complaints_id_seq', 2, true);

-- Complaint replies
INSERT INTO complaint_replies (id, complaint_id, sender_user_id, sender_name, sender_role, message)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 2, 'مدير برج الياسمين', 'GENERAL_MANAGER',
   'تم استلام الشكوى وسيتم التواصل مع ساكن الشقة 102 لحل الأمر بشكل ودي خلال 24 ساعة.'),
(2, 2, 3, 'مدير مركز الأعمال', 'GENERAL_MANAGER',
   'تم توجيه فريق الصيانة لإصلاح أرضية المدخل وسيتم الإنجاز خلال يومين.'),
(3, 2, 3, 'مدير مركز الأعمال', 'GENERAL_MANAGER',
   'تم الإنتهاء من إصلاح الأرضية بالكامل واستبدال البلاط المكسور. الشكوى مغلقة.')
ON CONFLICT DO NOTHING;
SELECT setval('complaint_replies_id_seq', 3, true);

-- Complaint rating for resolved complaint
INSERT INTO complaint_ratings (id, complaint_id, rater_user_id, rating, rater_role, rated_at)
OVERRIDING SYSTEM VALUE VALUES
(1, 2, 14, 'EXCELLENT', 'TENANT', NOW())
ON CONFLICT (complaint_id) DO NOTHING;
SELECT setval('complaint_ratings_id_seq', 1, true);

-- ============================================================
-- STEP 12: VISIT RATINGS for completed maintenance requests (IDs 1 and 5)
-- tenant_id=1 for request 1, tenant_id=13 for request 5
-- ============================================================
INSERT INTO visit_ratings (id, request_id, tenant_id, rating, comment)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 5, 'خدمة ممتازة وسريعة جداً، الفني كان محترفاً وأنجز العمل بشكل مثالي.'),
(2, 5, 13, 4, 'العمل تم بصورة جيدة لكن استغرق وقتاً أطول من المتوقع.')
ON CONFLICT (request_id) DO NOTHING;
SELECT setval('visit_ratings_id_seq', 2, true);

-- ============================================================
-- STEP 13: UPDATE EXPENSE/APPROVED STATUS
-- Mark some expenses as approved
-- ============================================================
UPDATE expenses SET status='PAID', approved_by=1, approved_at=NOW() - INTERVAL '5 days'
WHERE status='PAID' AND approved_by IS NULL;
