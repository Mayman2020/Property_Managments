-- Fix period_month and period_year from SMALLINT to INTEGER to match entity mapping
ALTER TABLE maintenance_invoices
    ALTER COLUMN period_month TYPE INTEGER,
    ALTER COLUMN period_year  TYPE INTEGER;
