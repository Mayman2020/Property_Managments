-- V173: payroll_runs.status CHECK omitted REJECTED while PayrollService.reject() sets it.
-- Align DB constraint with implemented workflow: SUBMITTED/DRAFT -> REJECTED.

SET search_path = property_mgmt;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_runs_status_check'
          AND conrelid = 'property_mgmt.payroll_runs'::regclass
    ) THEN
        ALTER TABLE property_mgmt.payroll_runs DROP CONSTRAINT payroll_runs_status_check;
    END IF;

    ALTER TABLE property_mgmt.payroll_runs
        ADD CONSTRAINT payroll_runs_status_check
            CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'));
END $$;
