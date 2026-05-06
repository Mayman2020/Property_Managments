-- V103: Replace legacy roles with the streamlined role set.
-- PROPERTY_ADMIN -> GENERAL_MANAGER
-- CONTRACTS_OFFICER -> ACCOUNTANT
-- HR_OFFICER -> PROCEDURES_CLERK
-- MAINTENANCE_OFFICER + contractor_company_id set -> MAINTENANCE_CONTRACTOR

UPDATE users SET role = 'GENERAL_MANAGER' WHERE role = 'PROPERTY_ADMIN';
UPDATE users SET role = 'ACCOUNTANT' WHERE role = 'CONTRACTS_OFFICER';
UPDATE users SET role = 'PROCEDURES_CLERK' WHERE role = 'HR_OFFICER';
UPDATE users SET role = 'MAINTENANCE_CONTRACTOR'
WHERE role = 'MAINTENANCE_OFFICER' AND contractor_company_id IS NOT NULL;

DELETE FROM role_permissions WHERE role IN (
    'PROPERTY_ADMIN', 'CONTRACTS_OFFICER', 'HR_OFFICER'
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN (
        'SUPER_ADMIN',
        'GENERAL_MANAGER',
        'ACCOUNTANT',
        'MAINTENANCE_CONTRACTOR',
        'MAINTENANCE_OFFICER',
        'PROPERTY_GUARD',
        'PROCEDURES_CLERK',
        'OWNER',
        'TENANT'
    ));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_role_check
    CHECK (role IN (
        'SUPER_ADMIN',
        'GENERAL_MANAGER',
        'ACCOUNTANT',
        'MAINTENANCE_CONTRACTOR',
        'MAINTENANCE_OFFICER',
        'PROPERTY_GUARD',
        'PROCEDURES_CLERK',
        'OWNER',
        'TENANT'
    ));
