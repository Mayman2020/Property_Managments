-- V127: Add must_change_password flag to users table.
-- When TRUE the user must change their temporary password before accessing the system.
-- All existing non-SUPER_ADMIN accounts are flagged so they are prompted to set a
-- personal password the next time they log in.

SET search_path = property_mgmt;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Flag every non-super-admin account that still has a temporary/default password.
-- SUPER_ADMIN is excluded because it is the bootstrap account.
UPDATE users
SET must_change_password = TRUE
WHERE role <> 'SUPER_ADMIN';
