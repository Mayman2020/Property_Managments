-- V49: Financial views
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
    WHERE status = 'PAID'
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
              WHERE e.property_id = p.id AND e.status = 'PAID'
                AND date_trunc('month', e.expense_date) = date_trunc('month', now())), 0) AS this_month_expenses,
    COALESCE((SELECT SUM(rps.amount)
              FROM rent_payment_schedule rps
              JOIN lease_contracts lc2 ON rps.contract_id = lc2.id
              WHERE lc2.property_id = p.id AND rps.status = 'OVERDUE'), 0) AS overdue_amount
FROM properties p;
