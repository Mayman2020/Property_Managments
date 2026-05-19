ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS description_ar TEXT,
    ADD COLUMN IF NOT EXISTS description_en TEXT;

ALTER TABLE maintenance_contract_invoices
    ADD COLUMN IF NOT EXISTS description_ar TEXT,
    ADD COLUMN IF NOT EXISTS description_en TEXT;

UPDATE maintenance_contract_invoices
SET description_ar = COALESCE(description_ar, 'فاتورة عقد صيانة ' || invoice_number),
    description_en = COALESCE(description_en, 'Maintenance contract invoice ' || invoice_number)
WHERE description_ar IS NULL OR description_en IS NULL;

UPDATE expenses
SET description_ar = COALESCE(description_ar, 'فاتورة عقد صيانة ' || replace(expense_number, 'EXP-MC-', '')),
    description_en = COALESCE(description_en, 'Maintenance contract invoice ' || replace(expense_number, 'EXP-MC-', ''))
WHERE expense_number LIKE 'EXP-MC-%'
  AND (description_ar IS NULL OR description_en IS NULL);
