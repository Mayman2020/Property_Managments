CREATE TABLE IF NOT EXISTS payroll_deductions (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    deduction_date DATE NOT NULL,
    payroll_month VARCHAR(7) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SENT_TO_ACCOUNTANT','APPROVED','REJECTED')),
    created_by BIGINT REFERENCES users(id),
    reviewed_by BIGINT REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_deductions_employee_reason_month
    ON payroll_deductions(employee_id, lower(reason), payroll_month);

CREATE INDEX IF NOT EXISTS idx_payroll_deductions_employee_month_status
    ON payroll_deductions(employee_id, payroll_month, status);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN (
        'SUPER_ADMIN',
        'GENERAL_MANAGER',
        'ACCOUNTANT',
        'HR_OFFICER',
        'MAINTENANCE_OFFICER_INTERNAL',
        'MAINTENANCE_OFFICER_COMPANY',
        'MAINTENANCE_COMPANY',
        'PROPERTY_GUARD',
        'PROCEDURES_CLERK',
        'OWNER',
        'TENANT'
    ));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_role_check
    CHECK (role IN (
        'SUPER_ADMIN',
        'GENERAL_MANAGER',
        'ACCOUNTANT',
        'HR_OFFICER',
        'MAINTENANCE_OFFICER_INTERNAL',
        'MAINTENANCE_OFFICER_COMPANY',
        'MAINTENANCE_COMPANY',
        'PROPERTY_GUARD',
        'PROCEDURES_CLERK',
        'OWNER',
        'TENANT'
    ));

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked)
VALUES ('JOB_TITLE', 'HR_OFFICER', 'موظف موارد بشرية', 'Human Resources Officer', 25, true, false)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

INSERT INTO role_permissions (role, permissions_json, created_at, updated_at)
VALUES (
    'HR_OFFICER',
    '{"dashboard":{"enabled":true,"menu":true,"view":true,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"properties":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"units":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"tenants":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"maintenance":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"inventory":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"reports":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"users":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"lookups":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"contractors":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"ratings":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"schedule":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"profile":{"enabled":true,"menu":true,"view":true,"create":false,"edit":true,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"my_unit":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"new_request":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"my_requests":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"permissions":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"contracts":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"finance":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"hr":{"enabled":true,"menu":true,"view":true,"create":true,"edit":true,"delete":false,"assign":false,"schedule":false,"start":false,"submit":true,"approve":true,"reject":true,"export":true,"rate":false,"manage":false,"toggle":false},"owner_portal":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"vacancies":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"notifications":{"enabled":true,"menu":true,"view":true,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false},"audit":{"enabled":false,"menu":false,"view":false,"create":false,"edit":false,"delete":false,"assign":false,"schedule":false,"start":false,"submit":false,"approve":false,"reject":false,"export":false,"rate":false,"manage":false,"toggle":false}}',
    NOW(),
    NOW()
)
ON CONFLICT (role) DO UPDATE
SET permissions_json = EXCLUDED.permissions_json,
    updated_at = NOW();
