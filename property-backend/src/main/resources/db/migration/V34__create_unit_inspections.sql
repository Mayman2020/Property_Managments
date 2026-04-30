-- Unit Inspections (معاينة الوحدات)
CREATE TABLE unit_inspections (
    id                      BIGSERIAL PRIMARY KEY,
    unit_id                 BIGINT REFERENCES units(id),
    contract_id             BIGINT REFERENCES lease_contracts(id),
    inspection_type         VARCHAR(20) CHECK (inspection_type IN ('MOVE_IN','MOVE_OUT','PERIODIC')),
    inspection_date         DATE NOT NULL,

    walls_condition         INT CHECK (walls_condition BETWEEN 1 AND 5),
    floors_condition        INT CHECK (floors_condition BETWEEN 1 AND 5),
    doors_condition         INT CHECK (doors_condition BETWEEN 1 AND 5),
    windows_condition       INT CHECK (windows_condition BETWEEN 1 AND 5),
    plumbing_condition      INT CHECK (plumbing_condition BETWEEN 1 AND 5),
    electrical_condition    INT CHECK (electrical_condition BETWEEN 1 AND 5),
    ac_condition            INT CHECK (ac_condition BETWEEN 1 AND 5),

    overall_condition       VARCHAR(20) CHECK (overall_condition IN ('EXCELLENT','GOOD','FAIR','POOR')),
    notes                   TEXT,
    damages_description     TEXT,
    deductions_amount       DECIMAL(10,2) DEFAULT 0,

    tenant_confirmed        BOOLEAN DEFAULT FALSE,
    officer_id              BIGINT REFERENCES users(id),

    created_at              TIMESTAMP DEFAULT NOW()
);

-- Inspection Photos
CREATE TABLE inspection_photos (
    id              BIGSERIAL PRIMARY KEY,
    inspection_id   BIGINT REFERENCES unit_inspections(id) ON DELETE CASCADE,
    photo_url       VARCHAR(500) NOT NULL,
    area            VARCHAR(100),
    caption         VARCHAR(300),
    uploaded_at     TIMESTAMP DEFAULT NOW()
);
