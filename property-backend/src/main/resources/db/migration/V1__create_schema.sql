-- V1: Core users table (referenced by everything else)

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150),
    phone           VARCHAR(20),
    role            VARCHAR(30) NOT NULL CHECK (role IN (
                        'SUPER_ADMIN','PROPERTY_ADMIN','MAINTENANCE_OFFICER','TENANT'
                    )),
    property_id     BIGINT,   -- FK added after properties table created
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_users_property ON users(property_id);
