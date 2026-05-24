-- Phase 2: maintenance SLA deadline and breach flag

ALTER TABLE maintenance_requests
    ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;

ALTER TABLE maintenance_requests
    ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill deadline from created_at + legacy day-based SLA
UPDATE maintenance_requests
SET sla_deadline = created_at + (
    CASE priority
        WHEN 'URGENT' THEN INTERVAL '1 day'
        WHEN 'HIGH' THEN INTERVAL '3 days'
        WHEN 'LOW' THEN INTERVAL '14 days'
        ELSE INTERVAL '7 days'
    END
)
WHERE sla_deadline IS NULL AND created_at IS NOT NULL;

UPDATE maintenance_requests
SET sla_deadline = NOW() + INTERVAL '48 hours'
WHERE sla_deadline IS NULL;

ALTER TABLE maintenance_requests
    ALTER COLUMN sla_deadline SET NOT NULL;

UPDATE maintenance_requests
SET sla_breached = TRUE
WHERE sla_deadline < NOW()
  AND status NOT IN ('COMPLETED', 'CANCELLED');
