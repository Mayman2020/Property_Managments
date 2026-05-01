-- V72: Property attachments – files stored on server disk, linked to property by FK
CREATE TABLE IF NOT EXISTS property_attachments (
    id            BIGSERIAL PRIMARY KEY,
    property_id   BIGINT       NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name   VARCHAR(255) NOT NULL UNIQUE,
    file_path     VARCHAR(500) NOT NULL,
    file_size     BIGINT,
    mime_type     VARCHAR(100),
    uploaded_by   BIGINT,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prop_att_property FOREIGN KEY (property_id)
        REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_property_attachments_property ON property_attachments(property_id);
