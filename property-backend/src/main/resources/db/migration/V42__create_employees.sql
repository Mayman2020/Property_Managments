-- V42: Employees and departments
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    dept_name_ar VARCHAR(100) NOT NULL,
    dept_name_en VARCHAR(100),
    manager_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    national_id VARCHAR(30) UNIQUE,
    nationality VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('MALE','FEMALE')),
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    photo_url VARCHAR(500),
    department_id BIGINT REFERENCES departments(id),
    property_id BIGINT REFERENCES properties(id),
    job_title_ar VARCHAR(150),
    job_title_en VARCHAR(150),
    employment_type VARCHAR(30) CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','DAILY')),
    hire_date DATE NOT NULL,
    end_date DATE,
    basic_salary DECIMAL(12,2) NOT NULL,
    housing_allowance DECIMAL(10,2) DEFAULT 0,
    transport_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    total_salary DECIMAL(12,2) GENERATED ALWAYS AS (basic_salary + housing_allowance + transport_allowance + other_allowances) STORED,
    currency VARCHAR(10) DEFAULT 'SAR',
    salary_day INT DEFAULT 25,
    bank_name VARCHAR(150),
    bank_iban VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED')),
    contract_url VARCHAR(500),
    national_id_url VARCHAR(500),
    linked_user_id BIGINT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_dept_manager;
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_employees_property ON employees(property_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
