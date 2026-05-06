-- Module catalog no longer tracks a display-only monthly price column.
ALTER TABLE module_definitions DROP COLUMN IF EXISTS monthly_price;
