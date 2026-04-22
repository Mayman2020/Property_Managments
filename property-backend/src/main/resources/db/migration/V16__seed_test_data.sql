-- V16: Test data — 1 property, 1 unit, 1 tenant user, 1 officer user
-- Passwords are BCrypt hashes for "Test@1234"

-- Maintenance officer user
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
VALUES (
    'officer1',
    'officer1@propmgmt.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKkLHn.2',
    'أحمد الفني',
    '0501111111',
    'MAINTENANCE_OFFICER',
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- Tenant user (linked to tenant record below)
INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active)
VALUES (
    'tenant1',
    'tenant1@propmgmt.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKkLHn.2',
    'محمد المستأجر',
    '0502222222',
    'TENANT',
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- Owner
INSERT INTO owners (full_name, phone, email)
VALUES ('شركة العقارات المتحدة', '0503333333', 'owner@propmgmt.com')
ON CONFLICT DO NOTHING;

-- Property (with owner FK — use subquery to avoid hardcoded IDs)
INSERT INTO properties (owner_id, property_name, property_code, property_type, address, city, total_floors, total_units)
SELECT
    o.id,
    'برج الياسمين السكني',
    'PROP-TEST-001',
    'RESIDENTIAL',
    'شارع الملك فهد، حي النزهة',
    'الرياض',
    10,
    20
FROM owners o
WHERE o.email = 'owner@propmgmt.com'
ON CONFLICT (property_code) DO NOTHING;

-- Unit
INSERT INTO units (property_id, unit_number, unit_type, area_sqm, rent_amount, is_rented)
SELECT
    p.id,
    '101',
    'APARTMENT',
    120.00,
    3500.00,
    TRUE
FROM properties p
WHERE p.property_code = 'PROP-TEST-001'
ON CONFLICT DO NOTHING;

-- Tenant record linked to the tenant user and unit
INSERT INTO tenants (user_id, unit_id, full_name, phone, email, lease_start, lease_end, is_active)
SELECT
    u.id,
    un.id,
    'محمد المستأجر',
    '0502222222',
    'tenant1@propmgmt.com',
    CURRENT_DATE - INTERVAL '6 months',
    CURRENT_DATE + INTERVAL '6 months',
    TRUE
FROM users u, units un
WHERE u.username = 'tenant1'
  AND un.unit_number = '101'
ON CONFLICT (email) DO NOTHING;
