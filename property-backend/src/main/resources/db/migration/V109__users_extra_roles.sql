-- Additional portal roles (comma-separated enum names) merged with users.role for authorities & UI permissions.
ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_roles VARCHAR(500);
