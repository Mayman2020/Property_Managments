-- V80: Change invoice_month and invoice_year from SMALLINT to INTEGER
--      to match the Java entity mapping (Integer -> int4, not int2)

ALTER TABLE maintenance_contract_invoices
    ALTER COLUMN invoice_month TYPE INTEGER,
    ALTER COLUMN invoice_year  TYPE INTEGER;
