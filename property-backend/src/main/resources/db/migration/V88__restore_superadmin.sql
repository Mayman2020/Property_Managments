-- V88: Restore SUPER_ADMIN user removed by V87 cascade
-- V87's TRUNCATE CASCADE inadvertently cascaded into the users table.
-- Password: 12345

SET search_path = property_mgmt;

INSERT INTO users (username, email, password_hash, full_name, role, is_active)
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
        role          = 'SUPER_ADMIN',
        is_active     = TRUE;
