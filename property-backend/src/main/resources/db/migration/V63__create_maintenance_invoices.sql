CREATE TABLE maintenance_invoices (
    id                    BIGSERIAL PRIMARY KEY,
    invoice_number        VARCHAR(30)    NOT NULL UNIQUE,
    contractor_company_id BIGINT         NOT NULL,
    property_id           BIGINT,
    unit_id               BIGINT,
    period_month          SMALLINT       NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year           SMALLINT       NOT NULL CHECK (period_year >= 2020),
    amount                DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
    description           TEXT,
    file_url              VARCHAR(500),
    status                VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    notes                 TEXT,
    reviewed_by           BIGINT,
    reviewed_at           TIMESTAMP,
    submitted_by          BIGINT,
    created_at            TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_inv_company  ON maintenance_invoices(contractor_company_id);
CREATE INDEX idx_maint_inv_status   ON maintenance_invoices(status);
CREATE INDEX idx_maint_inv_period   ON maintenance_invoices(period_year, period_month);
CREATE INDEX idx_maint_inv_property ON maintenance_invoices(property_id);
