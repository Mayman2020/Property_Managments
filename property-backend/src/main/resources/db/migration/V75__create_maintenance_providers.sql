-- V75: Flexible maintenance provider abstraction
-- A provider is either an internal USER or an external COMPANY (contractor_companies)

CREATE TABLE IF NOT EXISTS maintenance_providers (
    id            BIGSERIAL PRIMARY KEY,
    provider_type VARCHAR(10)  NOT NULL,           -- USER | COMPANY
    user_id       BIGINT,
    company_id    BIGINT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mp_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    CONSTRAINT fk_mp_company FOREIGN KEY (company_id) REFERENCES contractor_companies(id),

    CONSTRAINT chk_mp_type CHECK (provider_type IN ('USER', 'COMPANY')),
    CONSTRAINT chk_mp_user_xor_company CHECK (
        (provider_type = 'USER'    AND user_id    IS NOT NULL AND company_id IS NULL) OR
        (provider_type = 'COMPANY' AND company_id IS NOT NULL AND user_id    IS NULL)
    ),

    -- Prevent duplicate provider records for the same user/company
    CONSTRAINT uq_mp_user    UNIQUE (user_id),
    CONSTRAINT uq_mp_company UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_user    ON maintenance_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_company ON maintenance_providers(company_id);
