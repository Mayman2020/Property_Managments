-- V156: Annual rent escalation fields on lease contracts
ALTER TABLE lease_contracts
    ADD COLUMN IF NOT EXISTS escalation_type  VARCHAR(20)      DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS escalation_rate  DECIMAL(5,2)     DEFAULT 0.00;
-- escalation_type: NONE | PERCENTAGE | FIXED_AMOUNT
