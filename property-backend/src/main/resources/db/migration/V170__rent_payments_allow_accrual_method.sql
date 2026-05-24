-- BUG-009: ContractScheduler.applyLateFeesAfterGrace inserts rent_payments rows
-- with payment_method = 'ACCRUAL' to mark synthetic late-fee accruals, but the
-- original CHECK constraint (V31) only allowed CASH/BANK_TRANSFER/CHECK/ONLINE/OTHER.
-- This caused the rent-overdue scheduler to crash with a constraint violation and
-- roll back the OVERDUE flips. Extend the allowed set to include ACCRUAL.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'property_mgmt'
          AND t.relname = 'rent_payments'
          AND c.conname = 'rent_payments_payment_method_check'
    ) THEN
        EXECUTE 'ALTER TABLE property_mgmt.rent_payments DROP CONSTRAINT rent_payments_payment_method_check';
    END IF;

    EXECUTE 'ALTER TABLE property_mgmt.rent_payments
        ADD CONSTRAINT rent_payments_payment_method_check
        CHECK (payment_method IS NULL OR payment_method IN (
            ''CASH'',''BANK_TRANSFER'',''CHECK'',''ONLINE'',''OTHER'',''ACCRUAL''
        ))';
END $$;
