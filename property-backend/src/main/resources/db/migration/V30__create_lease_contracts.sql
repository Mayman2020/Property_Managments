-- Lease Contracts (عقود الإيجار)
CREATE TABLE lease_contracts (
    id                  BIGSERIAL PRIMARY KEY,
    contract_number     VARCHAR(50) UNIQUE NOT NULL,
    tenant_id           BIGINT REFERENCES tenants(id),
    unit_id             BIGINT REFERENCES units(id),
    property_id         BIGINT REFERENCES properties(id),
    owner_id            BIGINT REFERENCES owners(id),
    template_id         BIGINT REFERENCES contract_templates(id),

    -- Contract Dates
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    signing_date        DATE,

    -- Financial Terms
    monthly_rent        DECIMAL(12,2) NOT NULL,
    annual_rent         DECIMAL(12,2) GENERATED ALWAYS AS (monthly_rent * 12) STORED,
    security_deposit    DECIMAL(12,2) DEFAULT 0,
    payment_frequency   VARCHAR(20) DEFAULT 'MONTHLY'
                        CHECK (payment_frequency IN ('MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL')),
    payment_day         INT DEFAULT 1,
    currency            VARCHAR(10) DEFAULT 'SAR',

    -- Contract Status
    status              VARCHAR(30) DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','TERMINATED','RENEWED','SUSPENDED')),

    -- Renewal
    is_auto_renewable   BOOLEAN DEFAULT FALSE,
    renewal_notice_days INT DEFAULT 30,

    -- Documents
    contract_pdf_url    VARCHAR(500),
    signed_pdf_url      VARCHAR(500),

    -- Termination
    termination_date    DATE,
    termination_reason  TEXT,
    terminated_by       BIGINT REFERENCES users(id),

    -- Officers
    created_by          BIGINT REFERENCES users(id),
    approved_by         BIGINT REFERENCES users(id),

    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Contract Clauses (بنود إضافية للعقد)
CREATE TABLE contract_clauses (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     BIGINT REFERENCES lease_contracts(id) ON DELETE CASCADE,
    clause_order    INT,
    clause_title    VARCHAR(200),
    clause_text     TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Contract Attachments (مرفقات العقد)
CREATE TABLE contract_attachments (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     BIGINT REFERENCES lease_contracts(id) ON DELETE CASCADE,
    file_url        VARCHAR(500) NOT NULL,
    file_type       VARCHAR(30) CHECK (file_type IN ('NATIONAL_ID','COMMERCIAL_REG','CONTRACT_COPY','OTHER')),
    file_name       VARCHAR(255),
    uploaded_by     BIGINT REFERENCES users(id),
    uploaded_at     TIMESTAMP DEFAULT NOW()
);
