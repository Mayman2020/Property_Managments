-- Reset persisted OWNER permissions so they are recreated from Java defaults (RolePermissionService) on next read.
DELETE FROM role_permissions WHERE role = 'OWNER';
