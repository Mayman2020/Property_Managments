-- V11: Persistent in-app notifications

CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    recipient_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id       BIGINT REFERENCES users(id),
    property_id         BIGINT REFERENCES properties(id),
    request_id          BIGINT REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    type                VARCHAR(40) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    read_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_recipient_created
    ON notifications(recipient_user_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_unread
    ON notifications(recipient_user_id, read_at)
    WHERE read_at IS NULL;

CREATE INDEX idx_notifications_request
    ON notifications(request_id);
