-- V38: Expand notifications with templates and delivery metadata
CREATE TABLE IF NOT EXISTS notification_templates (
    id BIGSERIAL PRIMARY KEY,
    template_code VARCHAR(100) UNIQUE NOT NULL,
    title_ar VARCHAR(300) NOT NULL,
    title_en VARCHAR(300),
    body_ar TEXT NOT NULL,
    body_en TEXT,
    channel VARCHAR(20) CHECK (channel IN ('IN_APP','SMS','EMAIL','WHATSAPP','ALL')),
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES notification_templates(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(20);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(20);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id BIGINT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE notifications SET is_read = TRUE WHERE read_at IS NOT NULL;
UPDATE notifications SET channel = COALESCE(channel, 'IN_APP');
UPDATE notifications SET is_sent = TRUE WHERE is_sent = FALSE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_type_check
    CHECK (recipient_type IS NULL OR recipient_type IN ('TENANT','ADMIN','OWNER','OFFICER','ACCOUNTANT','HR_OFFICER'));

INSERT INTO notification_templates (template_code, title_ar, title_en, body_ar, body_en, channel, variables)
VALUES
('RENT_DUE_3_DAYS', '????? ????? ??????', 'Rent payment reminder', '????? {{tenant_name}}? ????? ???? ????? ????? {{amount}} {{currency}} ?????? {{due_date}}', 'Dear {{tenant_name}}, a rent payment of {{amount}} {{currency}} is due on {{due_date}}.', 'ALL', '{"tenant_name":"","amount":"","currency":"","due_date":""}'),
('RENT_OVERDUE', '???? ????? ??????', 'Overdue rent payment', '????? {{tenant_name}}? ???? ????? {{amount}} {{currency}} ?????? ??? {{days_overdue}} ???', 'Dear {{tenant_name}}, a rent payment of {{amount}} {{currency}} is overdue by {{days_overdue}} days.', 'ALL', '{"tenant_name":"","amount":"","currency":"","days_overdue":""}'),
('CONTRACT_EXPIRY_30', '???? ????? ??????', 'Contract expiring soon', '????? {{tenant_name}}? ??? ????? ?????? {{unit_number}} ????? ??? 30 ??? ?????? {{end_date}}', 'Dear {{tenant_name}}, the lease for unit {{unit_number}} will expire in 30 days on {{end_date}}.', 'ALL', '{"tenant_name":"","unit_number":"","end_date":""}'),
('CONTRACT_EXPIRY_7', '???? ????? ???? ?????', 'Contract expiring in one week', '????? {{tenant_name}}? ???? ????? ?????? {{end_date}}. ???? ??????? ?? ???????', 'Dear {{tenant_name}}, your contract ends on {{end_date}}. Please contact management.', 'ALL', '{"tenant_name":"","end_date":""}'),
('CONTRACT_ACTIVATED', '?? ????? ????', 'Contract activated', '?????? {{tenant_name}}? ?? ????? ??? ?????? ?????? {{unit_number}} ?????', 'Hello {{tenant_name}}, your lease for unit {{unit_number}} has been activated.', 'ALL', '{"tenant_name":"","unit_number":""}'),
('MAINTENANCE_SCHEDULED', '???? ???????', 'Maintenance scheduled', '?? ????? ???? ??????? ?????? {{date}} ?? {{time_from}} ??? {{time_to}}', 'Maintenance has been scheduled on {{date}} from {{time_from}} to {{time_to}}.', 'ALL', '{"date":"","time_from":"","time_to":""}'),
('MAINTENANCE_COMPLETED', '?? ????? ???????', 'Maintenance completed', '?? ????? ??? ??????? ??? {{request_number}} ?????', 'Maintenance request {{request_number}} has been completed successfully.', 'IN_APP', '{"request_number":""}'),
('PAYMENT_RECEIVED', '?? ?????? ?????', 'Payment received', '?? ?????? ???? ????? {{amount}} {{currency}} ?????? {{date}}. ??? ???????: {{receipt_no}}', 'A payment of {{amount}} {{currency}} has been received on {{date}}. Receipt no: {{receipt_no}}.', 'ALL', '{"amount":"","currency":"","date":"","receipt_no":""}')
ON CONFLICT (template_code) DO NOTHING;
