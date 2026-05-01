-- V76: Property ↔ MaintenanceProvider assignment (supports history & multiple providers)

CREATE TABLE IF NOT EXISTS property_maintenance_assignments (
    id                      BIGSERIAL PRIMARY KEY,
    property_id             BIGINT      NOT NULL,
    maintenance_provider_id BIGINT      NOT NULL,
    is_primary              BOOLEAN     NOT NULL DEFAULT FALSE,
    start_date              DATE        NOT NULL,
    end_date                DATE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | ENDED | CANCELLED
    notes                   TEXT,
    created_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pma_property FOREIGN KEY (property_id)
        REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_pma_provider FOREIGN KEY (maintenance_provider_id)
        REFERENCES maintenance_providers(id)
);

CREATE INDEX IF NOT EXISTS idx_pma_property  ON property_maintenance_assignments(property_id);
CREATE INDEX IF NOT EXISTS idx_pma_provider  ON property_maintenance_assignments(maintenance_provider_id);
CREATE INDEX IF NOT EXISTS idx_pma_status    ON property_maintenance_assignments(status);
