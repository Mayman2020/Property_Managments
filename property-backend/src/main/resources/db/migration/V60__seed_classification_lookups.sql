-- Seed classification lookups for UNIT_TYPE, PROPERTY_TYPE, FLOOR_TYPE, CONTRACT_TYPE, TERMINATION_REASON

-- Expand the check constraint to allow new lookup types
ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN ('COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'FLOOR_TYPE', 'CONTRACT_TYPE', 'TERMINATION_REASON')
);

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
-- Unit Types
('UNIT_TYPE', 'APARTMENT',  'شقة',          'Apartment',  1, true, true),
('UNIT_TYPE', 'SHOP',       'محل تجاري',     'Shop',       2, true, true),
('UNIT_TYPE', 'OFFICE',     'مكتب',          'Office',     3, true, true),
('UNIT_TYPE', 'WAREHOUSE',  'مستودع',        'Warehouse',  4, true, true),
('UNIT_TYPE', 'VILLA',      'فيلا',          'Villa',      5, true, false),
('UNIT_TYPE', 'STUDIO',     'استوديو',       'Studio',     6, true, false),
('UNIT_TYPE', 'OTHER',      'أخرى',          'Other',      99, true, false),

-- Property Types
('PROPERTY_TYPE', 'RESIDENTIAL',  'سكني',      'Residential',  1, true, false),
('PROPERTY_TYPE', 'COMMERCIAL',   'تجاري',     'Commercial',   2, true, false),
('PROPERTY_TYPE', 'MIXED_USE',    'مختلط',     'Mixed Use',    3, true, false),
('PROPERTY_TYPE', 'INDUSTRIAL',   'صناعي',     'Industrial',   4, true, false),

-- Floor Types
('FLOOR_TYPE', 'BASEMENT', 'بدروم',        'Basement',    1, true, false),
('FLOOR_TYPE', 'GROUND',   'أرضي',         'Ground',      2, true, false),
('FLOOR_TYPE', 'MEZZANINE','ميزانين',      'Mezzanine',   3, true, false),
('FLOOR_TYPE', 'UPPER',    'طابق علوي',    'Upper Floor', 4, true, false),
('FLOOR_TYPE', 'ROOF',     'سطح',          'Roof',        5, true, false),

-- Contract Types
('CONTRACT_TYPE', 'RESIDENTIAL', 'سكني',    'Residential', 1, true, false),
('CONTRACT_TYPE', 'COMMERCIAL',  'تجاري',   'Commercial',  2, true, false),
('CONTRACT_TYPE', 'SHORT_TERM',  'قصير الأجل', 'Short Term', 3, true, false),

-- Termination Reasons
('TERMINATION_REASON', 'TENANT_REQUEST',   'طلب المستأجر',       'Tenant Request',      1, true, false),
('TERMINATION_REASON', 'OWNER_REQUEST',    'طلب المالك',          'Owner Request',       2, true, false),
('TERMINATION_REASON', 'NON_PAYMENT',      'عدم السداد',          'Non-Payment',         3, true, false),
('TERMINATION_REASON', 'VIOLATION',        'مخالفة',              'Violation',           4, true, false),
('TERMINATION_REASON', 'PROPERTY_SALE',    'بيع العقار',          'Property Sale',       5, true, false),
('TERMINATION_REASON', 'RENOVATION',       'تجديد',               'Renovation',          6, true, false),
('TERMINATION_REASON', 'EXPIRY',           'انتهاء العقد',        'Contract Expiry',     7, true, false),
('TERMINATION_REASON', 'OTHER',            'أخرى',                'Other',               99, true, false);
