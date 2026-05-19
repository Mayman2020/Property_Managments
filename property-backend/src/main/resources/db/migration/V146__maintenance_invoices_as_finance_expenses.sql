-- Make issued maintenance contract invoices visible as payable outgoing expenses.
INSERT INTO expenses (
    expense_number,
    property_id,
    category_id,
    description,
    amount,
    currency,
    expense_date,
    status,
    created_at
)
SELECT
    'EXP-MC-' || mci.invoice_number,
    mci.property_id,
    ec.id,
    'فاتورة عقد صيانة ' || mci.invoice_number,
    ROUND(mci.amount, 2),
    'OMR',
    COALESCE(mci.paid_date, mci.due_date, CURRENT_DATE),
    CASE WHEN mci.status = 'PAID' THEN 'PAID' ELSE 'PENDING' END,
    COALESCE(mci.created_at, NOW())
FROM maintenance_contract_invoices mci
LEFT JOIN expense_categories ec ON ec.category_code = 'MAINT-LABOR'
WHERE mci.status IN ('ISSUED', 'OVERDUE', 'PAID')
  AND NOT EXISTS (
      SELECT 1
      FROM expenses e
      WHERE e.expense_number = 'EXP-MC-' || mci.invoice_number
  );

CREATE OR REPLACE VIEW property_pnl AS
SELECT
    p.id AS property_id,
    p.property_name,
    m.year,
    m.month,
    COALESCE(rent.rent_revenue, 0) AS rent_revenue,
    COALESCE(other_rev.other_revenue, 0) AS other_revenue,
    COALESCE(exp.total_expenses, 0) AS total_expenses,
    COALESCE(rent.rent_revenue, 0) + COALESCE(other_rev.other_revenue, 0) - COALESCE(exp.total_expenses, 0) AS net_income
FROM properties p
CROSS JOIN (
    SELECT EXTRACT(YEAR FROM d)::INT AS year, EXTRACT(MONTH FROM d)::INT AS month
    FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') d
) m
LEFT JOIN (
    SELECT lc.property_id, EXTRACT(YEAR FROM rp.payment_date)::INT AS year,
           EXTRACT(MONTH FROM rp.payment_date)::INT AS month,
           SUM(rp.amount_paid) AS rent_revenue
    FROM rent_payments rp
    JOIN lease_contracts lc ON lc.id = rp.contract_id
    GROUP BY lc.property_id, EXTRACT(YEAR FROM rp.payment_date), EXTRACT(MONTH FROM rp.payment_date)
) rent ON rent.property_id = p.id AND rent.year = m.year AND rent.month = m.month
LEFT JOIN (
    SELECT property_id, EXTRACT(YEAR FROM revenue_date)::INT AS year,
           EXTRACT(MONTH FROM revenue_date)::INT AS month,
           SUM(amount) AS other_revenue
    FROM other_revenues
    GROUP BY property_id, EXTRACT(YEAR FROM revenue_date), EXTRACT(MONTH FROM revenue_date)
) other_rev ON other_rev.property_id = p.id AND other_rev.year = m.year AND other_rev.month = m.month
LEFT JOIN (
    SELECT property_id, EXTRACT(YEAR FROM expense_date)::INT AS year,
           EXTRACT(MONTH FROM expense_date)::INT AS month,
           SUM(amount) AS total_expenses
    FROM expenses
    WHERE status IN ('PENDING', 'PAID')
    GROUP BY property_id, EXTRACT(YEAR FROM expense_date), EXTRACT(MONTH FROM expense_date)
) exp ON exp.property_id = p.id AND exp.year = m.year AND exp.month = m.month;

CREATE OR REPLACE VIEW dashboard_financial AS
SELECT
    p.id AS property_id,
    p.property_name,
    COALESCE((SELECT SUM(rp.amount_paid)
              FROM rent_payments rp
              JOIN lease_contracts lc ON lc.id = rp.contract_id
              WHERE lc.property_id = p.id
                AND date_trunc('month', rp.payment_date) = date_trunc('month', now())), 0) AS this_month_collected,
    COALESCE((SELECT SUM(or2.amount)
              FROM other_revenues or2
              WHERE or2.property_id = p.id
                AND date_trunc('month', or2.revenue_date) = date_trunc('month', now())), 0) AS this_month_other_revenue,
    COALESCE((SELECT SUM(e.amount)
              FROM expenses e
              WHERE e.property_id = p.id
                AND e.status IN ('PENDING', 'PAID')
                AND date_trunc('month', e.expense_date) = date_trunc('month', now())), 0) AS this_month_expenses,
    COALESCE((SELECT SUM(rps.amount)
              FROM rent_payment_schedule rps
              JOIN lease_contracts lc2 ON rps.contract_id = lc2.id
              WHERE lc2.property_id = p.id AND rps.status = 'OVERDUE'), 0) AS overdue_amount
FROM properties p;

UPDATE employees e
SET job_title_ar = 'موظف تابع لشركة الصيانة - ' || COALESCE(cc.name_ar, cc.name_en, cc.name),
    job_title_en = 'Maintenance company officer - ' || COALESCE(cc.name_en, cc.name_ar, cc.name)
FROM users u
JOIN contractor_companies cc ON cc.id = u.contractor_company_id
WHERE e.linked_user_id = u.id
  AND u.role = 'MAINTENANCE_OFFICER_COMPANY';
