CREATE TABLE IF NOT EXISTS module_definitions (
    module_key VARCHAR(80) PRIMARY KEY,
    title_ar VARCHAR(200) NOT NULL,
    title_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    icon VARCHAR(80),
    required_modules TEXT,
    recommended_modules TEXT,
    monthly_price DECIMAL(12,2) DEFAULT 0,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS module_presets (
    preset_code VARCHAR(80) PRIMARY KEY,
    preset_name_ar VARCHAR(200) NOT NULL,
    preset_name_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS module_preset_items (
    id BIGSERIAL PRIMARY KEY,
    preset_code VARCHAR(80) NOT NULL REFERENCES module_presets(preset_code) ON DELETE CASCADE,
    module_key VARCHAR(80) NOT NULL REFERENCES module_definitions(module_key) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(preset_code, module_key)
);

INSERT INTO module_definitions (
    module_key, title_ar, title_en, description_ar, description_en, icon,
    required_modules, recommended_modules, monthly_price, display_order, is_active
) VALUES
('contracts', 'العقود والإيجارات', 'Contracts & Rentals', 'العقود والمدفوعات والمخالفات والشكاوى.', 'Contracts, rent payments, violations, and complaints.', 'description', '[]', '["finance","vacancies"]', 500, 10, TRUE),
('vacancies', 'الوحدات الشاغرة', 'Vacancies', 'إعلانات الوحدات الشاغرة والاستفسارات.', 'Vacancy listings and rental inquiries.', 'door_open', '["contracts"]', '[]', 150, 20, TRUE),
('maintenance', 'الصيانة', 'Maintenance', 'طلبات الصيانة وجدولتها ومتابعتها.', 'Maintenance requests, scheduling, and tracking.', 'construction', '[]', '["inventory","vendors"]', 400, 30, TRUE),
('inventory', 'المخزون', 'Inventory', 'مخزون الصيانة والمستلزمات.', 'Spare parts and inventory management.', 'inventory_2', '[]', '["maintenance"]', 120, 40, TRUE),
('finance', 'المالية', 'Finance', 'الإيرادات والمصروفات والتقارير المالية.', 'Revenue, expenses, payroll expense sync, and financial reports.', 'bar_chart', '[]', '["contracts","hr"]', 450, 50, TRUE),
('hr', 'الموارد البشرية', 'Human Resources', 'الموظفون والرواتب والخصومات والإجازات.', 'Employees, payroll, deductions, and leave management.', 'badge', '[]', '["finance"]', 350, 60, TRUE),
('vendors', 'الموردون', 'Vendors', 'إدارة الموردين والمقاولين الخارجيين.', 'Vendor and contractor management.', 'engineering', '[]', '["maintenance","finance"]', 140, 70, TRUE),
('reports', 'التقارير', 'Reports', 'التقارير التشغيلية والإدارية.', 'Operational reporting and KPIs.', 'summarize', '[]', '["maintenance","finance","contracts"]', 180, 80, TRUE),
('notifications', 'الإشعارات', 'Notifications', 'مركز الإشعارات والتنبيهات.', 'Notification center and alerts.', 'notifications', '[]', '[]', 90, 90, TRUE),
('audit', 'سجل العمليات', 'Audit Log', 'متابعة من عدل ومتى.', 'Track who changed what and when.', 'history', '[]', '[]', 110, 100, TRUE),
('owner_portal', 'بوابة المالك', 'Owner Portal', 'لوحة المالك وكشوف الحساب الخاصة به.', 'Owner dashboard and monthly statements.', 'apartment', '["finance"]', '["contracts"]', 200, 110, TRUE)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO module_presets (
    preset_code, preset_name_ar, preset_name_en, description_ar, description_en, display_order, is_active
) VALUES
('FULL_SUITE', 'الباقة الكاملة', 'Full Suite', 'تشغيل كل موديولات النظام.', 'Enable the full property management suite.', 10, TRUE),
('MAINTENANCE_ONLY', 'الصيانة فقط', 'Maintenance Only', 'تشغيل الصيانة والمخزون والموردين.', 'Maintenance-focused package with inventory and vendors.', 20, TRUE),
('HR_PAYROLL', 'الموظفون والرواتب', 'HR + Payroll', 'إدارة الموظفين والرواتب والخصومات مع المالية.', 'Employees, payroll, deductions, with finance support.', 30, TRUE),
('FINANCE_HR', 'المالية والموارد البشرية', 'Finance + HR', 'تشغيل المالية والموارد البشرية والتقارير.', 'Finance, HR, and reporting package.', 40, TRUE),
('LEASING_FINANCE', 'العقود والتحصيل', 'Leasing + Finance', 'العقود والتحصيل مع التقارير المالية.', 'Contracts, collections, vacancies, and finance.', 50, TRUE)
ON CONFLICT (preset_code) DO NOTHING;

INSERT INTO module_preset_items (preset_code, module_key, is_enabled) VALUES
('FULL_SUITE', 'contracts', TRUE), ('FULL_SUITE', 'vacancies', TRUE), ('FULL_SUITE', 'maintenance', TRUE),
('FULL_SUITE', 'inventory', TRUE), ('FULL_SUITE', 'finance', TRUE), ('FULL_SUITE', 'hr', TRUE),
('FULL_SUITE', 'vendors', TRUE), ('FULL_SUITE', 'reports', TRUE), ('FULL_SUITE', 'notifications', TRUE),
('FULL_SUITE', 'audit', TRUE), ('FULL_SUITE', 'owner_portal', TRUE),

('MAINTENANCE_ONLY', 'maintenance', TRUE), ('MAINTENANCE_ONLY', 'inventory', TRUE),
('MAINTENANCE_ONLY', 'vendors', TRUE), ('MAINTENANCE_ONLY', 'notifications', TRUE),
('MAINTENANCE_ONLY', 'reports', TRUE),

('HR_PAYROLL', 'hr', TRUE), ('HR_PAYROLL', 'finance', TRUE), ('HR_PAYROLL', 'notifications', TRUE),
('HR_PAYROLL', 'audit', TRUE), ('HR_PAYROLL', 'reports', TRUE),

('FINANCE_HR', 'finance', TRUE), ('FINANCE_HR', 'hr', TRUE), ('FINANCE_HR', 'reports', TRUE),
('FINANCE_HR', 'notifications', TRUE), ('FINANCE_HR', 'audit', TRUE), ('FINANCE_HR', 'owner_portal', TRUE),

('LEASING_FINANCE', 'contracts', TRUE), ('LEASING_FINANCE', 'vacancies', TRUE),
('LEASING_FINANCE', 'finance', TRUE), ('LEASING_FINANCE', 'reports', TRUE),
('LEASING_FINANCE', 'notifications', TRUE), ('LEASING_FINANCE', 'audit', TRUE),
('LEASING_FINANCE', 'owner_portal', TRUE)
ON CONFLICT (preset_code, module_key) DO NOTHING;
