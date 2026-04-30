-- V52: Extend roles and role permissions for HR and owner portal
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
CHECK (role IN ('SUPER_ADMIN','PROPERTY_ADMIN','MAINTENANCE_OFFICER','TENANT','CONTRACTS_OFFICER','ACCOUNTANT','HR_OFFICER','OWNER'));

INSERT INTO role_permissions (role, permissions_json, created_at, updated_at)
VALUES
('HR_OFFICER', '{"dashboard":{"enabled":true,"menu":true,"view":true},"hr":{"enabled":true,"menu":true,"view":true,"create":true,"edit":true,"approve":true,"export":true},"profile":{"enabled":true,"menu":true,"view":true,"edit":true}}', NOW(), NOW()),
('OWNER', '{"owner_portal":{"enabled":true,"menu":true,"view":true},"profile":{"enabled":true,"menu":true,"view":true,"edit":true}}', NOW(), NOW())
ON CONFLICT (role) DO NOTHING;
