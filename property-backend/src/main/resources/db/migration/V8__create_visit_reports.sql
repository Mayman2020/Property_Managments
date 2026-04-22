-- V8: Visit Reports (post-visit by maintenance officer)

CREATE TABLE visit_reports (
    id                  BIGSERIAL PRIMARY KEY,
    request_id          BIGINT NOT NULL REFERENCES maintenance_requests(id),
    officer_id          BIGINT NOT NULL REFERENCES users(id),
    visit_date          DATE NOT NULL,
    visit_outcome       VARCHAR(30) NOT NULL CHECK (visit_outcome IN (
                            'COMPLETED',
                            'TENANT_ABSENT',
                            'NEEDS_PARTS',
                            'NEEDS_REVISIT',
                            'CANCELLED_BY_TENANT',
                            'OTHER'
                        )),
    work_done           TEXT,
    officer_notes       TEXT,
    has_purchase        BOOLEAN DEFAULT FALSE,
    receipt_url         VARCHAR(500),
    purchase_amount     DECIMAL(10,2),
    purchase_notes      TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Junction: items used in a visit report
CREATE TABLE visit_report_items (
    id              BIGSERIAL PRIMARY KEY,
    visit_report_id BIGINT NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
    item_id         BIGINT NOT NULL REFERENCES inventory_items(id),
    quantity_used   DECIMAL(10,2) NOT NULL CHECK (quantity_used > 0),
    notes           TEXT
);

CREATE INDEX idx_visit_reports_request ON visit_reports(request_id);
CREATE INDEX idx_visit_reports_officer ON visit_reports(officer_id);
CREATE INDEX idx_visit_reports_date    ON visit_reports(visit_date DESC);
CREATE INDEX idx_vr_items_report       ON visit_report_items(visit_report_id);
