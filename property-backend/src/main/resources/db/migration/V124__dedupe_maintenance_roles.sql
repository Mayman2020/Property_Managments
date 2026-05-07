-- V124: Remove duplicated maintenance roles in data.
-- - MAINTENANCE_OFFICER -> MAINTENANCE_OFFICER_INTERNAL or MAINTENANCE_OFFICER_COMPANY (based on maintenance_officer_type/contractor_company_id)
-- - MAINTENANCE_CONTRACTOR -> MAINTENANCE_COMPANY
-- Also updates role_permissions and check constraints to drop legacy values.

-- 0) Drop old constraints first so data remap can use new role names safely.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;

-- 1) users.role
UPDATE users
SET role = 'MAINTENANCE_OFFICER_COMPANY'
WHERE role = 'MAINTENANCE_OFFICER'
  AND (maintenance_officer_type = 'CONTRACTOR_COMPANY' OR contractor_company_id IS NOT NULL);

UPDATE users
SET role = 'MAINTENANCE_OFFICER_INTERNAL'
WHERE role = 'MAINTENANCE_OFFICER';

UPDATE users
SET role = 'MAINTENANCE_COMPANY'
WHERE role = 'MAINTENANCE_CONTRACTOR';

-- 2) users.extra_roles (comma-separated)
UPDATE users
SET extra_roles = regexp_replace(extra_roles, '(^|,)MAINTENANCE_CONTRACTOR(,|$)', '\\1MAINTENANCE_COMPANY\\2', 'g')
WHERE extra_roles IS NOT NULL AND extra_roles LIKE '%MAINTENANCE_CONTRACTOR%';

-- For MAINTENANCE_OFFICER extras, map using same rule.
UPDATE users
SET extra_roles = regexp_replace(extra_roles, '(^|,)MAINTENANCE_OFFICER(,|$)', '\\1MAINTENANCE_OFFICER_COMPANY\\2', 'g')
WHERE extra_roles IS NOT NULL
  AND extra_roles LIKE '%MAINTENANCE_OFFICER%'
  AND (maintenance_officer_type = 'CONTRACTOR_COMPANY' OR contractor_company_id IS NOT NULL);

UPDATE users
SET extra_roles = regexp_replace(extra_roles, '(^|,)MAINTENANCE_OFFICER(,|$)', '\\1MAINTENANCE_OFFICER_INTERNAL\\2', 'g')
WHERE extra_roles IS NOT NULL AND extra_roles LIKE '%MAINTENANCE_OFFICER%';

-- Cleanup double-commas and leading/trailing commas if any
UPDATE users
SET extra_roles = trim(both ',' from regexp_replace(extra_roles, ',{2,}', ',', 'g'))
WHERE extra_roles IS NOT NULL;

-- 3) role_permissions rows
-- If both legacy and new rows exist, drop legacy row to avoid unique conflict.
DELETE FROM role_permissions rp
WHERE rp.role = 'MAINTENANCE_CONTRACTOR'
  AND EXISTS (
    SELECT 1
    FROM role_permissions x
    WHERE x.role = 'MAINTENANCE_COMPANY'
  );

UPDATE role_permissions
SET role = 'MAINTENANCE_COMPANY'
WHERE role = 'MAINTENANCE_CONTRACTOR';

-- Duplicate old maintenance_officer permissions into new roles then delete the legacy row.
INSERT INTO role_permissions(role, permissions_json)
SELECT 'MAINTENANCE_OFFICER_INTERNAL', rp.permissions_json
FROM role_permissions rp
WHERE rp.role = 'MAINTENANCE_OFFICER'
ON CONFLICT (role) DO NOTHING;

INSERT INTO role_permissions(role, permissions_json)
SELECT 'MAINTENANCE_OFFICER_COMPANY', rp.permissions_json
FROM role_permissions rp
WHERE rp.role = 'MAINTENANCE_OFFICER'
ON CONFLICT (role) DO NOTHING;

DELETE FROM role_permissions WHERE role IN ('MAINTENANCE_OFFICER');

-- 4) Constraints: remove legacy values
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'GENERAL_MANAGER',
    'ACCOUNTANT',
    'MAINTENANCE_OFFICER_INTERNAL',
    'MAINTENANCE_OFFICER_COMPANY',
    'MAINTENANCE_COMPANY',
    'PROPERTY_GUARD',
    'PROCEDURES_CLERK',
    'OWNER',
    'TENANT'
  ));

ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'GENERAL_MANAGER',
    'ACCOUNTANT',
    'MAINTENANCE_OFFICER_INTERNAL',
    'MAINTENANCE_OFFICER_COMPANY',
    'MAINTENANCE_COMPANY',
    'PROPERTY_GUARD',
    'PROCEDURES_CLERK',
    'OWNER',
    'TENANT'
  ));

