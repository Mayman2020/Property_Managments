-- V78: Monthly invoices generated from annual maintenance contracts
--      Also adds UNIQUE constraint on maintenance_contracts.contract_number

-- Add unique constraint on contract_number if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_mc_contract_number'
          AND conrelid = 'maintenance_contracts'::regclass
    ) THEN
        ALTER TABLE maintenance_contracts ADD CONSTRAINT uq_mc_contract_number UNIQUE (contract_number);
    END IF;
END $$;

-- Monthly invoice table: one row per contract × month × year
CREATE TABLE IF NOT EXISTS maintenance_contract_invoices (
    id                    BIGSERIAL PRIMARY KEY,
    invoice_number        VARCHAR(50)    NOT NULL,
    contract_id           BIGINT         NOT NULL,
    contractor_company_id BIGINT         NOT NULL,
    property_id           BIGINT         NOT NULL,
    invoice_month         SMALLINT       NOT NULL CHECK (invoice_month BETWEEN 1 AND 12),
    invoice_year          SMALLINT       NOT NULL CHECK (invoice_year BETWEEN 2000 AND 2100),
    amount                NUMERIC(15, 3) NOT NULL,
    due_date              DATE,
    paid_date             DATE,
    status                VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',  -- DRAFT | ISSUED | PAID | OVERDUE | CANCELLED
    notes                 TEXT,
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mci_contract FOREIGN KEY (contract_id)
        REFERENCES maintenance_contracts(id),
    CONSTRAINT fk_mci_company  FOREIGN KEY (contractor_company_id)
        REFERENCES contractor_companies(id),
    CONSTRAINT fk_mci_property FOREIGN KEY (property_id)
        REFERENCES properties(id),
    CONSTRAINT uq_mci_invoice_number  UNIQUE (invoice_number),
    CONSTRAINT uq_mci_contract_period UNIQUE (contract_id, invoice_month, invoice_year)
);

CREATE INDEX IF NOT EXISTS idx_mci_contract ON maintenance_contract_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_mci_company  ON maintenance_contract_invoices(contractor_company_id);
CREATE INDEX IF NOT EXISTS idx_mci_property ON maintenance_contract_invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_mci_status   ON maintenance_contract_invoices(status);
CREATE INDEX IF NOT EXISTS idx_mci_period   ON maintenance_contract_invoices(invoice_year, invoice_month);
