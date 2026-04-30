-- V43: Payroll
CREATE TABLE IF NOT EXISTS payroll_runs (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    pay_period_year INT NOT NULL,
    pay_period_month INT NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
    pay_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PAID','CANCELLED')),
    total_basic DECIMAL(14,2) DEFAULT 0,
    total_allowances DECIMAL(14,2) DEFAULT 0,
    total_deductions DECIMAL(14,2) DEFAULT 0,
    total_bonuses DECIMAL(14,2) DEFAULT 0,
    total_net DECIMAL(14,2) DEFAULT 0,
    notes TEXT,
    prepared_by BIGINT REFERENCES users(id),
    approved_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, pay_period_year, pay_period_month)
);

CREATE TABLE IF NOT EXISTS payslips (
    id BIGSERIAL PRIMARY KEY,
    payroll_run_id BIGINT REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id BIGINT REFERENCES employees(id),
    basic_salary DECIMAL(12,2) NOT NULL,
    housing_allowance DECIMAL(10,2) DEFAULT 0,
    transport_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    total_earnings DECIMAL(12,2),
    absence_deduction DECIMAL(10,2) DEFAULT 0,
    late_deduction DECIMAL(10,2) DEFAULT 0,
    advance_deduction DECIMAL(10,2) DEFAULT 0,
    penalty_deduction DECIMAL(10,2) DEFAULT 0,
    insurance_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(12,2),
    net_salary DECIMAL(12,2),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    payment_method VARCHAR(30),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_advances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES employees(id),
    amount DECIMAL(12,2) NOT NULL,
    request_date DATE NOT NULL,
    approved_date DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','DEDUCTED')),
    deducted_month INT,
    deducted_year INT,
    approved_by BIGINT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_bonuses (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES employees(id),
    payroll_run_id BIGINT REFERENCES payroll_runs(id),
    bonus_type VARCHAR(50) CHECK (bonus_type IN ('PERFORMANCE','ANNUAL','HOLIDAY','PROJECT','OTHER')),
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    approved_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
