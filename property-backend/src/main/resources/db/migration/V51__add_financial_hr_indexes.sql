-- V51: Additional indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_template ON notifications(template_id);
