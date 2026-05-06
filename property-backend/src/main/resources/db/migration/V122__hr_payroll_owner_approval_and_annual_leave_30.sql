-- Payroll workflow: SUBMITTED -> APPROVED -> PAID
ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check;
ALTER TABLE payroll_runs
    ADD CONSTRAINT payroll_runs_status_check
        CHECK (status IN ('SUBMITTED','APPROVED','PAID','CANCELLED'));

UPDATE payroll_runs
SET status = 'SUBMITTED'
WHERE status = 'DRAFT';

-- Gulf-style annual leave baseline
UPDATE leave_types
SET annual_days = 30
WHERE LOWER(COALESCE(type_name_en, '')) = 'annual leave';
