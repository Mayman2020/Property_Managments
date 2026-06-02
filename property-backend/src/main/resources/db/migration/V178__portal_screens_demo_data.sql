-- V178: Demo data for complaints approvals, maintenance invoices, contract workflows, expiry QA.

SET search_path = property_mgmt;

-- ── 1. Ad-hoc contractor maintenance invoices (accountant portal tab 1) ──
INSERT INTO maintenance_invoices (
    invoice_number, contractor_company_id, property_id, unit_id,
    period_month, period_year, amount, description, status, submitted_by
)
SELECT v.invoice_number, v.company_id, v.property_id, v.unit_id,
       v.period_month, v.period_year, v.amount, v.description, 'PENDING', 1
FROM (VALUES
    ('MINV-2026-001', 3, 1, 1,  5, 2026, 1850.00, 'فاتورة صيانة سباكة — مايو 2026'),
    ('MINV-2026-002', 2, 2, 7,  5, 2026, 2400.00, 'فاتورة صيانة تكييف — مايو 2026'),
    ('MINV-2026-003', 1, 3, 13, 5, 2026, 1320.00, 'فاتورة صيانة عامة — مايو 2026'),
    ('MINV-2026-004', 3, 4, 19, 4, 2026, 1670.00, 'فاتورة صيانة سباكة — أبريل 2026'),
    ('MINV-2026-005', 2, 2, 9,  5, 2026, 2100.00, 'فاتورة كهرباء وصيانة — مايو 2026')
) AS v(invoice_number, company_id, property_id, unit_id, period_month, period_year, amount, description)
ON CONFLICT (invoice_number) DO NOTHING;

-- ── 2. Lease contract approval queues (owner portal) ───────────────────
UPDATE lease_contracts
SET status = 'PENDING_TERMINATION_APPROVAL',
    termination_date = CURRENT_DATE + 30,
    termination_reason = 'طلب إنهاء العقد — انتقال المستأجر لعقار آخر (بيانات تجريبية)'
WHERE id = 1
  AND status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM lease_contracts WHERE status = 'PENDING_TERMINATION_APPROVAL'
  );

UPDATE lease_contracts
SET status = 'PENDING_RENEWAL_APPROVAL',
    renewal_proposed_start_date = end_date + 1,
    renewal_proposed_end_date = end_date + INTERVAL '1 year',
    renewal_proposed_rent_amount = monthly_rent * 1.05
WHERE id = 2
  AND status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM lease_contracts WHERE status = 'PENDING_RENEWAL_APPROVAL'
  );

-- ── 3. Maintenance contract approval queues ──────────────────────────────
INSERT INTO maintenance_contracts (
    property_id, contractor_company_id, assignment_id,
    contract_number, start_date, end_date, sla_hours, contract_value, status,
    owner_approval_status
)
SELECT 2, 2, 3, 'MC-2026-DRAFT-001', CURRENT_DATE, CURRENT_DATE + 365, 24, 22000.000, 'DRAFT', 'PENDING'
WHERE NOT EXISTS (
    SELECT 1 FROM maintenance_contracts WHERE status = 'DRAFT'
);

UPDATE maintenance_contracts
SET status = 'PENDING_TERMINATION_APPROVAL',
    termination_requested_by = 2,
    termination_requested_at = NOW(),
    termination_request_notes = 'طلب إلغاء عقد الصيانة — تغيير شركة الصيانة (بيانات تجريبية)',
    termination_proposed_date = CURRENT_DATE + 45
WHERE id = 2
  AND status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM maintenance_contracts WHERE status = 'PENDING_TERMINATION_APPROVAL'
  );

UPDATE maintenance_contracts
SET status = 'PENDING_RENEWAL_APPROVAL',
    renewal_requested_by = 3,
    renewal_requested_at = NOW(),
    renewal_requested_note = 'طلب تجديد عقد الصيانة لسنة إضافية (بيانات تجريبية)',
    renewal_proposed_start_date = end_date + 1,
    renewal_proposed_end_date = end_date + INTERVAL '1 year',
    renewal_proposed_value = contract_value * 1.08
WHERE id = 3
  AND status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM maintenance_contracts WHERE status = 'PENDING_RENEWAL_APPROVAL'
  );

-- ── 4. Ensure complaints exist for admin list ────────────────────────────
INSERT INTO tenant_complaints (
    tenant_id, unit_id, property_id, complaint_type, title, description,
    status, priority, assigned_to, resolved_at
)
SELECT t.id, lc.unit_id, lc.property_id, 'SERVICE',
       'شكوى خدمة — ' || COALESCE(t.full_name, 'مستأجر'),
       'بيانات تجريبية لشاشة شكاوى العقود.',
       'IN_REVIEW', 'NORMAL', 2, NULL
FROM tenants t
JOIN lease_contracts lc ON lc.tenant_id = t.id AND lc.status = 'ACTIVE'
WHERE (SELECT COUNT(*) FROM tenant_complaints) < 3
ORDER BY t.id
LIMIT 3;

-- ── 5. Ensure expiry report has contracts ending within 90 days ──────────
UPDATE lease_contracts
SET end_date = CURRENT_DATE + (((id % 60) + 7)::integer)
WHERE status = 'ACTIVE'
  AND end_date > CURRENT_DATE + 120;
