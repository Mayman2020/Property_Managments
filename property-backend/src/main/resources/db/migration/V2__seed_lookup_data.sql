-- V2: Seed super admin + maintenance categories

-- Default super admin (password: Admin@1234)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
    'superadmin',
    'admin@propmgmt.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKkLHn.2',  -- Admin@1234
    'Super Administrator',
    'SUPER_ADMIN'
);

-- Maintenance categories
CREATE TABLE maintenance_categories (
    id          BIGSERIAL PRIMARY KEY,
    name_ar     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    is_active   BOOLEAN DEFAULT TRUE
);

INSERT INTO maintenance_categories (name_ar, name_en, icon) VALUES
    ('سباكة',       'Plumbing',     'plumbing'),
    ('كهرباء',      'Electrical',   'electrical_services'),
    ('تكييف',       'HVAC',         'ac_unit'),
    ('نجارة',       'Carpentry',    'handyman'),
    ('دهانات',      'Painting',     'format_paint'),
    ('أعمال مدنية', 'Civil Works',  'construction'),
    ('أخرى',        'Other',        'build');
