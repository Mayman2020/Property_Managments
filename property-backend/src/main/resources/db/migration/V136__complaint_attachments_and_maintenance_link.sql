-- ── Complaint attachments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_mgmt.complaint_attachments (
    id            BIGSERIAL PRIMARY KEY,
    complaint_id  BIGINT       NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    file_type     VARCHAR(20),
    file_name     VARCHAR(255),
    file_size_kb  INTEGER,
    uploaded_by   BIGINT,
    uploaded_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint_id
    ON property_mgmt.complaint_attachments (complaint_id);

-- ── Link complaint → maintenance request ──────────────────────────────
ALTER TABLE property_mgmt.tenant_complaints
    ADD COLUMN IF NOT EXISTS maintenance_request_id BIGINT;

-- ── Mark maintenance request as complaint-originated ──────────────────
ALTER TABLE property_mgmt.maintenance_requests
    ADD COLUMN IF NOT EXISTS complaint_id   BIGINT,
    ADD COLUMN IF NOT EXISTS from_complaint BOOLEAN NOT NULL DEFAULT FALSE;
