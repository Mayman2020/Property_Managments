CREATE TABLE IF NOT EXISTS maintenance_contract_invoice_payments (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES maintenance_contract_invoices(id) ON DELETE CASCADE,
    installment_no INTEGER NOT NULL,
    amount NUMERIC(15,3) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    receipt_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    reminder_3d_sent_at TIMESTAMP,
    due_today_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_maintenance_invoice_payment_installment UNIQUE (invoice_id, installment_no),
    CONSTRAINT maintenance_invoice_payments_status_check CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_invoice_payments_invoice
    ON maintenance_contract_invoice_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_invoice_payments_status_due
    ON maintenance_contract_invoice_payments(status, due_date);
