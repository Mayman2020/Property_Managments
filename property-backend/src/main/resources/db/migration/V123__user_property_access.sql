-- Many-to-many: which properties a staff user may access when not SUPER_ADMIN/GENERAL_MANAGER for active role.
-- Seeded from legacy users.property_id so existing accountants/officers keep the same scope.

SET search_path = property_mgmt;

CREATE TABLE IF NOT EXISTS user_property_access (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    property_id BIGINT NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, property_id)
);

INSERT INTO user_property_access (user_id, property_id)
SELECT u.id, u.property_id
FROM users u
WHERE u.property_id IS NOT NULL
ON CONFLICT (user_id, property_id) DO NOTHING;
