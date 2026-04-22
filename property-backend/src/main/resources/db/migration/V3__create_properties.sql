-- V3: Owners and Properties

CREATE TABLE owners (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    national_id     VARCHAR(30) UNIQUE,
    phone           VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE properties (
    id              BIGSERIAL PRIMARY KEY,
    owner_id        BIGINT REFERENCES owners(id),
    property_name   VARCHAR(200) NOT NULL,
    property_code   VARCHAR(50) UNIQUE NOT NULL,
    property_type   VARCHAR(30) NOT NULL CHECK (property_type IN ('RESIDENTIAL','COMMERCIAL','MIXED')),
    address         TEXT NOT NULL,
    city            VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'Saudi Arabia',
    total_floors    INT DEFAULT 1,
    total_units     INT DEFAULT 0,
    description     TEXT,
    cover_image_url VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Now add FK from users to properties
ALTER TABLE users ADD CONSTRAINT fk_users_property
    FOREIGN KEY (property_id) REFERENCES properties(id);

CREATE INDEX idx_properties_owner  ON properties(owner_id);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_owners_active     ON owners(is_active);
