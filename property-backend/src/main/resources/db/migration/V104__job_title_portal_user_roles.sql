-- V104: Seed JOB_TITLE lookup rows aligned with portal user roles (after V103 role refactor).
SET search_path = property_mgmt;

-- Portal / user-role labels maintained under JOB_TITLE (code = UserRole enum name).
-- User Access screen lists these; HR employee form hides portal-only codes (see frontend filter).

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('JOB_TITLE', 'SUPER_ADMIN',           'مدير النظام',           'System Administrator',      10, true, false),
('JOB_TITLE', 'GENERAL_MANAGER',       'المدير العام',          'General Manager',            20, true, false),
('JOB_TITLE', 'MAINTENANCE_CONTRACTOR','شركة صيانة (مقاول)',    'Maintenance company (contractor)', 30, true, false),
('JOB_TITLE', 'MAINTENANCE_OFFICER',   'مسؤول صيانة',           'Maintenance officer',        40, true, false),
('JOB_TITLE', 'PROPERTY_GUARD',        'حارس عقار',             'Property guard',             50, true, false),
('JOB_TITLE', 'PROCEDURES_CLERK',      'مخلص إجراءات',          'Procedures clerk',           60, true, false),
('JOB_TITLE', 'OWNER',                 'مالك',                  'Owner',                      70, true, false),
('JOB_TITLE', 'TENANT',                'مستأجر',                'Tenant',                     80, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar    = EXCLUDED.name_ar,
    name_en    = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active  = EXCLUDED.is_active;
