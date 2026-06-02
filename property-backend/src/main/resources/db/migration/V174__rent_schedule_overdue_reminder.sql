ALTER TABLE rent_payment_schedule
    ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS overdue_reminder_snoozed_until TIMESTAMP NULL;
