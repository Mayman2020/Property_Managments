-- V154: Demo maintenance contracts and invoices for accountant portal screen
-- Companies: 1=الإبداع(prop3), 2=التقنية(prop2,prop4), 3=الأمان(prop1,prop4)
-- Assignments: 2=prop1+company3, 3=prop2+company2, 6=prop3+company1, 7=prop4+company3, 8=prop4+company2

-- ============================================================
-- MAINTENANCE CONTRACTS (one per company-property pair)
-- ============================================================
INSERT INTO maintenance_contracts (id, property_id, contractor_company_id, assignment_id,
    contract_number, start_date, end_date, sla_hours, contract_value, status)
OVERRIDING SYSTEM VALUE VALUES
-- Property 1 × شركة الأمان للسباكة
(1, 1, 3, 2, 'MC-2026-001', '2026-01-01', '2026-12-31', 24, 18000.000, 'ACTIVE'),
-- Property 2 × مؤسسة التقنية للتكييف والكهرباء
(2, 2, 2, 3, 'MC-2026-002', '2026-01-01', '2026-12-31', 12, 24000.000, 'ACTIVE'),
-- Property 3 × شركة الإبداع للصيانة العامة
(3, 3, 1, 6, 'MC-2026-003', '2026-01-01', '2026-12-31', 48, 15000.000, 'ACTIVE'),
-- Property 4 × شركة الأمان للسباكة
(4, 4, 3, 7, 'MC-2026-004', '2026-01-01', '2026-12-31', 24, 20000.000, 'ACTIVE')
ON CONFLICT (contract_number) DO NOTHING;
SELECT setval('maintenance_contracts_id_seq', 4, true);

-- ============================================================
-- MAINTENANCE CONTRACT INVOICES (monthly, 3 months each)
-- Amount = annual_value / 12 per month
-- ============================================================
INSERT INTO maintenance_contract_invoices (id, invoice_number, contract_id, contractor_company_id, property_id,
    invoice_month, invoice_year, amount, due_date, paid_date, status)
OVERRIDING SYSTEM VALUE VALUES
-- Contract 1 (prop1 × الأمان، 18000/yr → 1500/mo)
(1,  'MCI-2026-001', 1, 3, 1, 3, 2026, 1500.000, '2026-03-31', '2026-04-05', 'PAID'),
(2,  'MCI-2026-002', 1, 3, 1, 4, 2026, 1500.000, '2026-04-30', '2026-05-02', 'PAID'),
(3,  'MCI-2026-003', 1, 3, 1, 5, 2026, 1500.000, '2026-05-31', NULL,         'ISSUED'),
-- Contract 2 (prop2 × التقنية، 24000/yr → 2000/mo)
(4,  'MCI-2026-004', 2, 2, 2, 3, 2026, 2000.000, '2026-03-31', '2026-04-08', 'PAID'),
(5,  'MCI-2026-005', 2, 2, 2, 4, 2026, 2000.000, '2026-04-30', '2026-05-03', 'PAID'),
(6,  'MCI-2026-006', 2, 2, 2, 5, 2026, 2000.000, '2026-05-31', NULL,         'OVERDUE'),
-- Contract 3 (prop3 × الإبداع، 15000/yr → 1250/mo)
(7,  'MCI-2026-007', 3, 1, 3, 3, 2026, 1250.000, '2026-03-31', '2026-04-10', 'PAID'),
(8,  'MCI-2026-008', 3, 1, 3, 4, 2026, 1250.000, '2026-04-30', NULL,         'ISSUED'),
(9,  'MCI-2026-009', 3, 1, 3, 5, 2026, 1250.000, '2026-05-31', NULL,         'DRAFT'),
-- Contract 4 (prop4 × الأمان، 20000/yr → 1667/mo)
(10, 'MCI-2026-010', 4, 3, 4, 3, 2026, 1666.667, '2026-03-31', '2026-04-12', 'PAID'),
(11, 'MCI-2026-011', 4, 3, 4, 4, 2026, 1666.667, '2026-04-30', '2026-05-06', 'PAID'),
(12, 'MCI-2026-012', 4, 3, 4, 5, 2026, 1666.667, '2026-05-31', NULL,         'ISSUED')
ON CONFLICT (invoice_number) DO NOTHING;
SELECT setval('maintenance_contract_invoices_id_seq', 12, true);

-- ============================================================
-- Update currency lookup order: SAR first, OMR second
-- ============================================================
UPDATE lookups SET sort_order = 1 WHERE type = 'CURRENCY' AND code = 'SAR';
UPDATE lookups SET sort_order = 2 WHERE type = 'CURRENCY' AND code = 'OMR';
