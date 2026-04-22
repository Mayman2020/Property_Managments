CREATE TABLE IF NOT EXISTS property_mgmt.visit_ratings (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL UNIQUE,
    tenant_id BIGINT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_ratings_request_id ON property_mgmt.visit_ratings(request_id);

-- Add schedule acceptance fields to maintenance_requests
ALTER TABLE property_mgmt.maintenance_requests
    ADD COLUMN IF NOT EXISTS schedule_accepted BOOLEAN,
    ADD COLUMN IF NOT EXISTS schedule_rejection_note TEXT;
