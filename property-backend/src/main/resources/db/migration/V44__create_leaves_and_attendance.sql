-- V44: Leaves and attendance
CREATE TABLE IF NOT EXISTS leave_types (
    id BIGSERIAL PRIMARY KEY,
    type_name_ar VARCHAR(100) NOT NULL,
    type_name_en VARCHAR(100),
    annual_days INT DEFAULT 0,
    is_paid BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO leave_types (type_name_ar, type_name_en, annual_days, is_paid)
VALUES
('????? ?????', 'Annual Leave', 21, TRUE),
('????? ?????', 'Sick Leave', 10, TRUE),
('????? ?????', 'Emergency Leave', 3, TRUE),
('????? ???? ???', 'Unpaid Leave', 0, FALSE),
('????? ??', 'Hajj Leave', 10, TRUE),
('????? ?????', 'Maternity Leave', 70, TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_balances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES employees(id),
    leave_type_id BIGINT REFERENCES leave_types(id),
    year INT NOT NULL,
    entitled_days INT DEFAULT 0,
    used_days INT DEFAULT 0,
    remaining_days INT GENERATED ALWAYS AS (entitled_days - used_days) STORED,
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES employees(id),
    leave_type_id BIGINT REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    attachment_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) CHECK (status IN ('PRESENT','ABSENT','LATE','HALF_DAY','ON_LEAVE','HOLIDAY')),
    late_minutes INT DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    recorded_by BIGINT REFERENCES users(id),
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_req_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_req_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date);
