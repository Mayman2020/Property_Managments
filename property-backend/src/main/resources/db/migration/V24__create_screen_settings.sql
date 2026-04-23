CREATE TABLE screen_settings (
    screen_key        VARCHAR(80) PRIMARY KEY,
    globally_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at        TIMESTAMP DEFAULT NOW() NOT NULL
);

INSERT INTO screen_settings (screen_key, globally_enabled)
VALUES
('dashboard', TRUE),
('properties', TRUE),
('units', TRUE),
('tenants', TRUE),
('maintenance', TRUE),
('inventory', TRUE),
('reports', TRUE),
('users', TRUE),
('lookups', TRUE),
('contractors', TRUE),
('ratings', TRUE),
('schedule', TRUE),
('profile', TRUE),
('my_unit', TRUE),
('new_request', TRUE),
('my_requests', TRUE),
('permissions', TRUE)
ON CONFLICT (screen_key) DO NOTHING;
