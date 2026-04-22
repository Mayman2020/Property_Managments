-- V4: Floors and Units

CREATE TABLE floors (
    id              BIGSERIAL PRIMARY KEY,
    property_id     BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_number    INT NOT NULL,
    floor_label     VARCHAR(50),
    UNIQUE(property_id, floor_number)
);

CREATE TABLE units (
    id              BIGSERIAL PRIMARY KEY,
    property_id     BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_id        BIGINT REFERENCES floors(id),
    unit_number     VARCHAR(30) NOT NULL,
    unit_type       VARCHAR(30) NOT NULL CHECK (unit_type IN (
                        'APARTMENT','SHOP','OFFICE','WAREHOUSE','OTHER'
                    )),
    area_sqm        DECIMAL(10,2),
    bedrooms        INT,
    bathrooms       INT,
    is_rented       BOOLEAN DEFAULT FALSE,
    rent_amount     DECIMAL(12,2),
    currency        VARCHAR(10) DEFAULT 'SAR',
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_floor    ON units(floor_id);
CREATE INDEX idx_units_rented   ON units(is_rented);
CREATE INDEX idx_floors_property ON floors(property_id);
