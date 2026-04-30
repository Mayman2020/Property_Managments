CREATE TABLE IF NOT EXISTS property_module_settings (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    module_key VARCHAR(80) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(property_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_property_module_settings_property
    ON property_module_settings(property_id);
