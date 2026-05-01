-- V82: Re-create super admin user that was removed by V81 cascade
-- Password: 12345 (BCrypt hash from V25)

INSERT INTO property_mgmt.users (username, email, password_hash, full_name, role, is_active)
VALUES (
    'superadmin',
    'admin@propmgmt.com',
    '$2b$10$vC9x3Q19V1ySJOTxw0hLTelSRFQ2OUtjiOED1Vt8lCFT5nA8YevvS',
    'Super Administrator',
    'SUPER_ADMIN',
    TRUE
)
ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_active     = TRUE;
