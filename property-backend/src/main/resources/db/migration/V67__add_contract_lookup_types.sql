-- Drop old constraint and recreate with all types
ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE',
        'VIOLATION_STATUS', 'VIOLATION_SEVERITY', 'VIOLATION_TYPE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'INSPECTION_TYPE', 'INSPECTION_CONDITION'
    )
);

-- Add unique constraint if not exists (type + code must be unique)
ALTER TABLE lookups DROP CONSTRAINT IF EXISTS uq_lookup_type_code;
ALTER TABLE lookups ADD CONSTRAINT uq_lookup_type_code UNIQUE (type, code);

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES

-- Payment methods
('PAYMENT_METHOD', 'CASH',          'نقداً',           'Cash',            1, true, true),
('PAYMENT_METHOD', 'BANK_TRANSFER', 'تحويل بنكي',      'Bank Transfer',   2, true, true),
('PAYMENT_METHOD', 'CHECK',         'شيك',             'Check',           3, true, true),
('PAYMENT_METHOD', 'ONLINE',        'دفع إلكتروني',    'Online Payment',  4, true, true),
('PAYMENT_METHOD', 'OTHER',         'أخرى',            'Other',           99, true, false),

-- Payment frequencies
('PAYMENT_FREQUENCY', 'MONTHLY',     'شهري',       'Monthly',     1, true, true),
('PAYMENT_FREQUENCY', 'QUARTERLY',   'ربع سنوي',   'Quarterly',   2, true, true),
('PAYMENT_FREQUENCY', 'SEMI_ANNUAL', 'نصف سنوي',   'Semi-Annual', 3, true, true),
('PAYMENT_FREQUENCY', 'ANNUAL',      'سنوي',       'Annual',      4, true, true),

-- Contract statuses
('CONTRACT_STATUS', 'DRAFT',      'مسودة',   'Draft',      1, true, true),
('CONTRACT_STATUS', 'ACTIVE',     'نشط',     'Active',     2, true, true),
('CONTRACT_STATUS', 'EXPIRED',    'منتهي',   'Expired',    3, true, true),
('CONTRACT_STATUS', 'TERMINATED', 'محلول',   'Terminated', 4, true, true),
('CONTRACT_STATUS', 'RENEWED',    'مجدد',    'Renewed',    5, true, true),
('CONTRACT_STATUS', 'SUSPENDED',  'موقوف',   'Suspended',  6, true, true),

-- Violation statuses
('VIOLATION_STATUS', 'OPEN',      'مفتوحة',     'Open',      1, true, true),
('VIOLATION_STATUS', 'NOTIFIED',  'تم الإشعار', 'Notified',  2, true, true),
('VIOLATION_STATUS', 'RESOLVED',  'مغلقة',      'Resolved',  3, true, true),
('VIOLATION_STATUS', 'ESCALATED', 'مصعّدة',     'Escalated', 4, true, true),

-- Violation severities
('VIOLATION_SEVERITY', 'LOW',      'منخفضة',  'Low',      1, true, true),
('VIOLATION_SEVERITY', 'MEDIUM',   'متوسطة',  'Medium',   2, true, true),
('VIOLATION_SEVERITY', 'HIGH',     'عالية',   'High',     3, true, true),
('VIOLATION_SEVERITY', 'CRITICAL', 'حرجة',    'Critical', 4, true, true),

-- Violation types
('VIOLATION_TYPE', 'NOISE',        'إزعاج وضوضاء',      'Noise Disturbance',    1, true, false),
('VIOLATION_TYPE', 'DAMAGE',       'إتلاف ممتلكات',      'Property Damage',      2, true, false),
('VIOLATION_TYPE', 'LATE_PAYMENT', 'تأخر في السداد',     'Late Payment',         3, true, false),
('VIOLATION_TYPE', 'UNAUTHORIZED', 'استخدام غير مصرح',   'Unauthorized Use',     4, true, false),
('VIOLATION_TYPE', 'SUBLETTING',   'تأجير من الباطن',    'Subletting',           5, true, false),
('VIOLATION_TYPE', 'CLEANLINESS',  'إهمال النظافة',      'Cleanliness Neglect',  6, true, false),
('VIOLATION_TYPE', 'OTHER',        'أخرى',               'Other',                99, true, false),

-- Complaint statuses
('COMPLAINT_STATUS', 'OPEN',      'مفتوحة',       'Open',      1, true, true),
('COMPLAINT_STATUS', 'IN_REVIEW', 'قيد المراجعة', 'In Review', 2, true, true),
('COMPLAINT_STATUS', 'RESOLVED',  'محلولة',       'Resolved',  3, true, true),
('COMPLAINT_STATUS', 'CLOSED',    'مغلقة',        'Closed',    4, true, true),

-- Complaint priorities
('COMPLAINT_PRIORITY', 'LOW',    'منخفضة',  'Low',    1, true, true),
('COMPLAINT_PRIORITY', 'NORMAL', 'عادية',   'Normal', 2, true, true),
('COMPLAINT_PRIORITY', 'HIGH',   'عالية',   'High',   3, true, true),
('COMPLAINT_PRIORITY', 'URGENT', 'عاجلة',   'Urgent', 4, true, true),

-- Complaint types
('COMPLAINT_TYPE', 'MAINTENANCE', 'صيانة',          'Maintenance',      1, true, false),
('COMPLAINT_TYPE', 'NOISE',       'إزعاج',          'Noise',            2, true, false),
('COMPLAINT_TYPE', 'BILLING',     'فواتير ومدفوعات', 'Billing',         3, true, false),
('COMPLAINT_TYPE', 'NEIGHBOR',    'جار',             'Neighbor Issue',   4, true, false),
('COMPLAINT_TYPE', 'SECURITY',    'أمن وسلامة',      'Security',         5, true, false),
('COMPLAINT_TYPE', 'MANAGEMENT',  'إدارة',           'Management',       6, true, false),
('COMPLAINT_TYPE', 'OTHER',       'أخرى',            'Other',            99, true, false),

-- Inspection types
('INSPECTION_TYPE', 'CHECK_IN',   'كشف استلام',   'Check-In',    1, true, true),
('INSPECTION_TYPE', 'CHECK_OUT',  'كشف تسليم',    'Check-Out',   2, true, true),
('INSPECTION_TYPE', 'ROUTINE',    'دوري',          'Routine',     3, true, false),
('INSPECTION_TYPE', 'EMERGENCY',  'طارئ',          'Emergency',   4, true, false),
('INSPECTION_TYPE', 'COMPLAINT',  'شكوى',          'Complaint',   5, true, false),

-- Inspection overall conditions
('INSPECTION_CONDITION', 'EXCELLENT', 'ممتازة',  'Excellent', 1, true, true),
('INSPECTION_CONDITION', 'GOOD',      'جيدة',    'Good',      2, true, true),
('INSPECTION_CONDITION', 'FAIR',      'مقبولة',  'Fair',      3, true, true),
('INSPECTION_CONDITION', 'POOR',      'ضعيفة',   'Poor',      4, true, true)

ON CONFLICT (type, code) DO UPDATE SET
    name_ar    = EXCLUDED.name_ar,
    name_en    = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active  = EXCLUDED.is_active;
