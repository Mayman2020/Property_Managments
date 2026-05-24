-- BUG-010: maintenance_contract_invoice_payments.invoice_id has the wrong FK.
-- V149's CREATE TABLE intended REFERENCES maintenance_contract_invoices(id),
-- but the live DB shows REFERENCES maintenance_invoices(id) (the ad-hoc
-- contractor-submitted invoices table). This makes every POST
-- /maintenance-invoices/{id}/payment-plan and PATCH /maintenance-invoices/{id}/mark-paid
-- against a *contract* invoice fail with a foreign-key violation, breaking
-- both the FULL and SCHEDULED payment plan flows.
--
-- This migration restores the intended FK. Existing rows are preserved; if any
-- payment row references an id that does not exist in maintenance_contract_invoices
-- the rebuild will fail loudly (manual cleanup needed before re-running), which
-- is the safe behaviour.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'property_mgmt'
          AND t.relname = 'maintenance_contract_invoice_payments'
          AND c.conname = 'maintenance_contract_invoice_payments_invoice_id_fkey'
    ) THEN
        EXECUTE 'ALTER TABLE property_mgmt.maintenance_contract_invoice_payments
                 DROP CONSTRAINT maintenance_contract_invoice_payments_invoice_id_fkey';
    END IF;

    -- Sanity check: any orphan rows would block the new FK. Emit a notice so an
    -- operator can spot the bad data before the next migration step.
    IF EXISTS (
        SELECT 1
        FROM property_mgmt.maintenance_contract_invoice_payments p
        LEFT JOIN property_mgmt.maintenance_contract_invoices ci ON ci.id = p.invoice_id
        WHERE ci.id IS NULL
    ) THEN
        RAISE NOTICE 'Found maintenance_contract_invoice_payments rows with no matching maintenance_contract_invoices id — investigate before adding the new FK.';
    END IF;

    EXECUTE 'ALTER TABLE property_mgmt.maintenance_contract_invoice_payments
             ADD CONSTRAINT maintenance_contract_invoice_payments_invoice_id_fkey
             FOREIGN KEY (invoice_id)
             REFERENCES property_mgmt.maintenance_contract_invoices(id)
             ON DELETE CASCADE';
END $$;
