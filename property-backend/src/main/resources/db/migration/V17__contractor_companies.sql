-- V17: Registry of contracted maintenance companies (for admin reference / future links)

CREATE TABLE contractor_companies (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(40),
    email       VARCHAR(150),
    notes       TEXT,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
