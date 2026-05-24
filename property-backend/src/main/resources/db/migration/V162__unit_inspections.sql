-- Phase 2B: move-in / move-out inspections (replaces tables dropped in V98)
CREATE TABLE unit_inspections (
    id                  BIGSERIAL PRIMARY KEY,
    unit_id             BIGINT NOT NULL REFERENCES units(id),
    contract_id         BIGINT NOT NULL REFERENCES lease_contracts(id),
    inspection_type     VARCHAR(20) NOT NULL CHECK (inspection_type IN ('MOVE_IN', 'MOVE_OUT')),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'SIGNED')),
    inspector_id        BIGINT REFERENCES users(id),
    tenant_signed_at    TIMESTAMP,
    inspector_signed_at TIMESTAMP,
    notes               TEXT,
    total_deduction     DECIMAL(12, 2),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE unit_inspection_items (
    id                  BIGSERIAL PRIMARY KEY,
    inspection_id       BIGINT NOT NULL REFERENCES unit_inspections(id) ON DELETE CASCADE,
    area                VARCHAR(100) NOT NULL,
    condition           VARCHAR(20) CHECK (condition IN ('GOOD', 'FAIR', 'DAMAGED', 'MISSING')),
    notes               TEXT,
    photo_url           VARCHAR(500),
    estimated_deduction DECIMAL(12, 2),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unit_inspections_contract ON unit_inspections(contract_id);
CREATE INDEX idx_unit_inspections_unit ON unit_inspections(unit_id);
CREATE INDEX idx_unit_inspections_contract_type_status ON unit_inspections(contract_id, inspection_type, status);
CREATE INDEX idx_unit_inspection_items_inspection ON unit_inspection_items(inspection_id);
