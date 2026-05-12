-- ── Complaint replies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_mgmt.complaint_replies (
    id             BIGSERIAL PRIMARY KEY,
    complaint_id   BIGINT       NOT NULL,
    sender_user_id BIGINT,
    sender_name    VARCHAR(200),
    sender_role    VARCHAR(50),
    message        TEXT         NOT NULL,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_replies_complaint_id
    ON property_mgmt.complaint_replies (complaint_id);

-- ── Complaint ratings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_mgmt.complaint_ratings (
    id             BIGSERIAL PRIMARY KEY,
    complaint_id   BIGINT      NOT NULL UNIQUE,
    rater_user_id  BIGINT,
    rating         VARCHAR(30),
    rater_role     VARCHAR(50),
    rated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
