-- V77: Maintenance contracts — required only for COMPANY provider assignments

CREATE TABLE IF NOT EXISTS maintenance_contracts (
    id                    BIGSERIAL PRIMARY KEY,
    property_id           BIGINT         NOT NULL,
    contractor_company_id BIGINT         NOT NULL,
    assignment_id         BIGINT,
    contract_number       VARCHAR(100),
    start_date            DATE           NOT NULL,
    end_date              DATE,
    sla_hours             INT,
    contract_value        NUMERIC(15, 3),
    status                VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | ENDED | CANCELLED
    notes                 TEXT,
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mc_property    FOREIGN KEY (property_id)           REFERENCES properties(id),
    CONSTRAINT fk_mc_company     FOREIGN KEY (contractor_company_id)  REFERENCES contractor_companies(id),
    CONSTRAINT fk_mc_assignment  FOREIGN KEY (assignment_id)          REFERENCES property_maintenance_assignments(id),
    CONSTRAINT chk_mc_dates      CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_mc_property   ON maintenance_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_mc_company    ON maintenance_contracts(contractor_company_id);
CREATE INDEX IF NOT EXISTS idx_mc_assignment ON maintenance_contracts(assignment_id);
