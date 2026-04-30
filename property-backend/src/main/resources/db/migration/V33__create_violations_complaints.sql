-- Violations (مخالفات المستأجرين)
CREATE TABLE tenant_violations (
    id              BIGSERIAL PRIMARY KEY,
    contract_id     BIGINT REFERENCES lease_contracts(id),
    tenant_id       BIGINT REFERENCES tenants(id),
    unit_id         BIGINT REFERENCES units(id),
    violation_type  VARCHAR(50) CHECK (violation_type IN (
                        'LATE_PAYMENT','PROPERTY_DAMAGE','NOISE_COMPLAINT',
                        'UNAUTHORIZED_SUBLETTING','CONTRACT_BREACH',
                        'ILLEGAL_ACTIVITY','OTHER')),
    description     TEXT NOT NULL,
    severity        VARCHAR(20) CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status          VARCHAR(30) DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','NOTIFIED','RESOLVED','ESCALATED')),
    fine_amount     DECIMAL(10,2) DEFAULT 0,
    fine_paid       BOOLEAN DEFAULT FALSE,
    evidence_url    VARCHAR(500),
    reported_by     BIGINT REFERENCES users(id),
    resolved_by     BIGINT REFERENCES users(id),
    resolved_at     TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Tenant Complaints (شكاوى المستأجرين)
CREATE TABLE tenant_complaints (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT REFERENCES tenants(id),
    unit_id         BIGINT REFERENCES units(id),
    property_id     BIGINT REFERENCES properties(id),
    complaint_type  VARCHAR(50) CHECK (complaint_type IN (
                        'NEIGHBOR_NOISE','COMMON_AREA','SECURITY',
                        'MANAGEMENT','SERVICE','OTHER')),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    status          VARCHAR(30) DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','CLOSED')),
    priority        VARCHAR(20) DEFAULT 'NORMAL'
                    CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    assigned_to     BIGINT REFERENCES users(id),
    resolution      TEXT,
    attachment_url  VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW(),
    resolved_at     TIMESTAMP
);
