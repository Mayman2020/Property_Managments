-- V183: Add missing indexes on FK columns and frequently-filtered fields
-- Identified by production audit: queries on approval/audit/assignment columns were full-table scans.

SET search_path = property_mgmt;

-- lease_contracts: approval workflow and audit columns
CREATE INDEX IF NOT EXISTS idx_lease_contracts_approved_by         ON lease_contracts(approved_by);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_terminated_by       ON lease_contracts(terminated_by);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_template_id         ON lease_contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_owner_approval_status ON lease_contracts(owner_approval_status)
    WHERE owner_approval_status IS NOT NULL;

-- rent_payment_schedule: status and contract filtering
CREATE INDEX IF NOT EXISTS idx_rent_schedule_contract_status       ON rent_payment_schedule(contract_id, status);
CREATE INDEX IF NOT EXISTS idx_rent_schedule_due_date_status       ON rent_payment_schedule(due_date, status);

-- expenses: approval and submission workflow
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by               ON expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by                ON expenses(approved_by)
    WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id                  ON expenses(vendor_id)
    WHERE vendor_id IS NOT NULL;

-- other_revenues: audit trail
CREATE INDEX IF NOT EXISTS idx_other_revenues_recorded_by          ON other_revenues(recorded_by);

-- maintenance_invoices: reviewer tracking
CREATE INDEX IF NOT EXISTS idx_maintenance_invoices_reviewed_by    ON maintenance_invoices(reviewed_by)
    WHERE reviewed_by IS NOT NULL;

-- tenant_complaints: assignment tracking
CREATE INDEX IF NOT EXISTS idx_tenant_complaints_assigned_to       ON tenant_complaints(assigned_to)
    WHERE assigned_to IS NOT NULL;

-- unit_inspections: inspector queries
CREATE INDEX IF NOT EXISTS idx_unit_inspections_inspector_id       ON unit_inspections(inspector_id)
    WHERE inspector_id IS NOT NULL;

-- vacancy_listings: creator tracking
CREATE INDEX IF NOT EXISTS idx_vacancy_listings_created_by         ON vacancy_listings(created_by);

-- rental_inquiries: assignment tracking
CREATE INDEX IF NOT EXISTS idx_rental_inquiries_assigned_to        ON rental_inquiries(assigned_to)
    WHERE assigned_to IS NOT NULL;

-- budgets: category lookup
CREATE INDEX IF NOT EXISTS idx_budgets_category_id                 ON budgets(category_id);

-- maintenance_providers: status filtering
CREATE INDEX IF NOT EXISTS idx_maintenance_providers_status        ON maintenance_providers(status);

-- contract_renewals: lookup by original contract
CREATE INDEX IF NOT EXISTS idx_contract_renewals_original          ON contract_renewals(original_contract_id);

-- contract_fees: lookup by contract
CREATE INDEX IF NOT EXISTS idx_contract_fees_contract_id           ON contract_fees(contract_id);

-- vendor_contracts: date range queries
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_property_status    ON vendor_contracts(property_id, status);
