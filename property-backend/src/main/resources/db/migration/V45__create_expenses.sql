-- V45: Expenses
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGSERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name_ar VARCHAR(200) NOT NULL,
    category_name_en VARCHAR(200),
    parent_id BIGINT REFERENCES expense_categories(id),
    expense_type VARCHAR(30) CHECK (expense_type IN ('OPERATIONAL','MAINTENANCE','ADMINISTRATIVE','PAYROLL','UTILITY','CAPITAL')),
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO expense_categories (category_code, category_name_ar, category_name_en, expense_type)
VALUES
('UTIL-ELEC', '?????? ?????? ??????? ????????', 'Shared electricity bill', 'UTILITY'),
('UTIL-WATER', '?????? ???? ??????? ????????', 'Shared water bill', 'UTILITY'),
('UTIL-GAS', '?????? ???', 'Gas bill', 'UTILITY'),
('UTIL-INTERNET', '?????? ??????', 'Internet bill', 'UTILITY'),
('CLEAN-SUPPLY', '???????? ???????', 'Cleaning supplies', 'OPERATIONAL'),
('CLEAN-SERVICE', '???? ????? ??????', 'External cleaning service', 'OPERATIONAL'),
('CLEAN-EQUIP', '????? ?????', 'Cleaning equipment', 'OPERATIONAL'),
('MAINT-SPARE', '??? ???? ??????', 'Spare parts and tools', 'MAINTENANCE'),
('MAINT-LABOR', '???? ????? ??????', 'External maintenance labor', 'MAINTENANCE'),
('MAINT-ELEV', '????? ?????', 'Elevator maintenance', 'MAINTENANCE'),
('MAINT-FIRE', '????? ???? ????? ????', 'Fire system maintenance', 'MAINTENANCE'),
('MAINT-AC', '????? ????? ?????', 'Central AC maintenance', 'MAINTENANCE'),
('ADMIN-OFFICE', '???????? ??????', 'Office supplies', 'ADMINISTRATIVE'),
('ADMIN-PRINT', '????? ????????', 'Printing and stationery', 'ADMINISTRATIVE'),
('ADMIN-LEGAL', '???? ??????? ??????', 'Legal and documentation fees', 'ADMINISTRATIVE'),
('ADMIN-INSUR', '????? ??? ??????', 'Building insurance', 'ADMINISTRATIVE'),
('ADMIN-LICENSE', '?????? ???????? ??????', 'Government licenses and renewals', 'ADMINISTRATIVE'),
('PAY-SALARY', '????? ??????', 'Employee salaries', 'PAYROLL'),
('PAY-BONUS', '?????? ??????', 'Employee bonuses', 'PAYROLL'),
('PAY-OVERTIME', '????????', 'Overtime', 'PAYROLL'),
('CAP-RENOV', '??????? ????????', 'Renovations and improvements', 'CAPITAL'),
('CAP-EQUIP', '???? ?????', 'Equipment purchases', 'CAPITAL')
ON CONFLICT (category_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    property_id BIGINT REFERENCES properties(id),
    category_id BIGINT REFERENCES expense_categories(id),
    vendor_id BIGINT REFERENCES vendors(id),
    description TEXT NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    expense_date DATE NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN ('CASH','BANK_TRANSFER','CHECK','CREDIT_CARD','OTHER')),
    reference_number VARCHAR(100),
    receipt_url VARCHAR(500),
    invoice_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','PAID')),
    submitted_by BIGINT REFERENCES users(id),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    payroll_run_id BIGINT REFERENCES payroll_runs(id),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
