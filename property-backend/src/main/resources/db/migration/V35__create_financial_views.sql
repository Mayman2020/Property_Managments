-- Financial Summary View (ملخص مالي للتقارير)
CREATE OR REPLACE VIEW financial_summary AS
SELECT
    p.id                    AS property_id,
    p.property_name,
    COUNT(DISTINCT lc.id)   AS active_contracts,
    COALESCE(SUM(lc.monthly_rent), 0) AS total_monthly_rent,
    COALESCE(SUM(CASE WHEN rp.id IS NOT NULL THEN rp.amount_paid ELSE 0 END), 0) AS total_collected,
    COALESCE(SUM(CASE WHEN rps.status = 'OVERDUE' THEN rps.amount ELSE 0 END), 0) AS total_overdue
FROM properties p
LEFT JOIN lease_contracts lc ON lc.property_id = p.id AND lc.status = 'ACTIVE'
LEFT JOIN rent_payments rp ON rp.contract_id = lc.id
LEFT JOIN rent_payment_schedule rps ON rps.contract_id = lc.id
GROUP BY p.id, p.property_name;

-- Tenant Balance View
CREATE OR REPLACE VIEW tenant_balance AS
SELECT
    t.id                    AS tenant_id,
    t.full_name,
    lc.contract_number,
    lc.monthly_rent,
    COALESCE(SUM(CASE WHEN rps.status = 'OVERDUE' THEN rps.amount ELSE 0 END), 0) AS overdue_amount,
    COALESCE(SUM(CASE WHEN rps.status = 'PENDING' THEN rps.amount ELSE 0 END), 0)  AS pending_amount,
    COUNT(CASE WHEN rps.status = 'OVERDUE' THEN 1 END) AS overdue_months
FROM tenants t
JOIN lease_contracts lc ON lc.tenant_id = t.id AND lc.status = 'ACTIVE'
LEFT JOIN rent_payment_schedule rps ON rps.contract_id = lc.id
GROUP BY t.id, t.full_name, lc.contract_number, lc.monthly_rent;
