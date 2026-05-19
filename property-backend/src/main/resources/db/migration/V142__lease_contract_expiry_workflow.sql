-- V142: Lease contract expiry workflow
-- Adds no-renewal intent, deposit tracking, and damage receipt fields to lease_contracts.
-- Also adds EXP-DEPOSIT-RETURN expense category for deposit-return financial records.

ALTER TABLE lease_contracts
    ADD COLUMN IF NOT EXISTS no_renewal_intent_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS no_renewal_intent_by  BIGINT,
    ADD COLUMN IF NOT EXISTS deposit_income_recorded  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_expense_recorded BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS termination_damages_receipt_url TEXT,
    ADD COLUMN IF NOT EXISTS termination_damage_notes        TEXT;

INSERT INTO expense_categories (category_code, category_name_ar, category_name_en, expense_type)
VALUES ('EXP-DEPOSIT-RETURN', 'إعادة مبالغ التأمين للمستأجرين', 'Tenant Deposit Returns', 'OPERATIONAL')
ON CONFLICT (category_code) DO NOTHING;
