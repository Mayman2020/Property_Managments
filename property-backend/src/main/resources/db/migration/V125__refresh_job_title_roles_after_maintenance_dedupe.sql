-- V125: Refresh JOB_TITLE lookup codes after maintenance role dedupe.
SET search_path = property_mgmt;

-- Remove legacy maintenance role rows from JOB_TITLE.
DELETE FROM lookups
WHERE type = 'JOB_TITLE'
  AND code IN ('MAINTENANCE_OFFICER', 'MAINTENANCE_CONTRACTOR');

-- Upsert current portal role rows used by User Access screen.
INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('JOB_TITLE', 'SUPER_ADMIN',                 'مدير النظام',                 'System Administrator',            10, true, false),
('JOB_TITLE', 'ACCOUNTANT',                  'محاسب',                      'Accountant',                      20, true, false),
('JOB_TITLE', 'MAINTENANCE_OFFICER_INTERNAL','موظف صيانة',                 'Maintenance Officer',             30, true, false),
('JOB_TITLE', 'MAINTENANCE_OFFICER_COMPANY', 'موظف صيانة تابع لشركة',      'Company Maintenance Officer',     40, true, false),
('JOB_TITLE', 'MAINTENANCE_COMPANY',         'شركة صيانة',                 'Maintenance Company',             50, true, false),
('JOB_TITLE', 'PROPERTY_GUARD',              'حارس عقار',                  'Property Guard',                  60, true, false),
('JOB_TITLE', 'PROCEDURES_CLERK',            'مخلص إجراءات',               'Procedures Clerk',                70, true, false),
('JOB_TITLE', 'OWNER',                       'مالك',                       'Owner',                           80, true, false),
('JOB_TITLE', 'TENANT',                      'مستأجر',                     'Tenant',                          90, true, false),
('JOB_TITLE', 'GENERAL_MANAGER',             'المدير العام',               'General Manager',                100, false, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar    = EXCLUDED.name_ar,
    name_en    = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active  = EXCLUDED.is_active;

