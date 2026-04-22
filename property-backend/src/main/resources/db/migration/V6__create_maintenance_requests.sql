-- V6: Maintenance Requests + Attachments

CREATE SEQUENCE maintenance_request_seq START 1 INCREMENT 1;

CREATE TABLE maintenance_requests (
    id                  BIGSERIAL PRIMARY KEY,
    request_number      VARCHAR(30) UNIQUE NOT NULL,
    tenant_id           BIGINT REFERENCES tenants(id),
    unit_id             BIGINT REFERENCES units(id),
    property_id         BIGINT REFERENCES properties(id),
    category_id         BIGINT REFERENCES maintenance_categories(id),
    title               VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    priority            VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    status              VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN (
                            'PENDING','ASSIGNED','SCHEDULED','IN_PROGRESS',
                            'TENANT_ABSENT','COMPLETED','CANCELLED','NEEDS_REVISIT'
                        )),
    assigned_to         BIGINT REFERENCES users(id),
    scheduled_date      DATE,
    scheduled_time_from TIME,
    scheduled_time_to   TIME,
    tenant_notes        TEXT,
    closed_at           TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE request_attachments (
    id              BIGSERIAL PRIMARY KEY,
    request_id      BIGINT NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    file_url        VARCHAR(500) NOT NULL,
    file_type       VARCHAR(20) CHECK (file_type IN ('IMAGE','VIDEO','DOCUMENT')),
    file_name       VARCHAR(255),
    file_size_kb    INT,
    uploaded_by     BIGINT REFERENCES users(id),
    uploaded_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_requests_status     ON maintenance_requests(status);
CREATE INDEX idx_requests_property   ON maintenance_requests(property_id);
CREATE INDEX idx_requests_tenant     ON maintenance_requests(tenant_id);
CREATE INDEX idx_requests_assigned   ON maintenance_requests(assigned_to);
CREATE INDEX idx_requests_priority   ON maintenance_requests(priority);
CREATE INDEX idx_requests_created    ON maintenance_requests(created_at DESC);
CREATE INDEX idx_attachments_request ON request_attachments(request_id);
