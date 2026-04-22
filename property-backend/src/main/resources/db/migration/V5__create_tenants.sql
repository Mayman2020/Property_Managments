-- V5: Tenants

CREATE TABLE tenants (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),          -- linked system user (optional)
    unit_id         BIGINT REFERENCES units(id),
    full_name       VARCHAR(150) NOT NULL,
    national_id     VARCHAR(30),
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(100) UNIQUE,
    lease_start     DATE,
    lease_end       DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    profile_image   VARCHAR(500),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_unit   ON tenants(unit_id);
CREATE INDEX idx_tenants_active ON tenants(is_active);
CREATE INDEX idx_tenants_email  ON tenants(email);
