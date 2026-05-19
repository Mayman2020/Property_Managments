UPDATE expenses
SET description = regexp_replace(description, '^Maintenance contract invoice ', 'فاتورة عقد صيانة ')
WHERE description LIKE 'Maintenance contract invoice %';
