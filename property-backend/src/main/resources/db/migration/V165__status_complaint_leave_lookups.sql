ALTER TABLE lookups DROP CONSTRAINT IF EXISTS chk_lookup_type;
ALTER TABLE lookups ADD CONSTRAINT chk_lookup_type CHECK (
    type IN (
        'COUNTRY', 'CITY', 'UNIT_TYPE', 'PROPERTY_TYPE', 'PROPERTY_STATUS', 'FLOOR_TYPE',
        'PAYMENT_METHOD', 'PAYMENT_FREQUENCY', 'CONTRACT_TYPE', 'CONTRACT_STATUS',
        'TERMINATION_REASON', 'JOB_TITLE', 'UNIT_OF_MEASURE',
        'COMPLAINT_STATUS', 'COMPLAINT_PRIORITY', 'COMPLAINT_TYPE',
        'LEAVE_TYPE', 'LEAVE_STATUS', 'PAYMENT_SCHEDULE_STATUS',
        'EXPENSE_STATUS', 'PAYROLL_STATUS', 'MAINTENANCE_REQUEST_STATUS',
        'FURNISHED_STATUS', 'CURRENCY', 'MONTH', 'YEAR',
        'RENT_DISCOUNT_REASON', 'CONTRACT_DRAFT_AMEND_REASON'
    )
);

UPDATE leave_types SET type_name_ar = 'إجازة سنوية', type_name_en = 'Annual Leave', annual_days = 30 WHERE id = 1;
UPDATE leave_types SET type_name_ar = 'إجازة مرضية', type_name_en = 'Sick Leave' WHERE id = 2;
UPDATE leave_types SET type_name_ar = 'إجازة طارئة', type_name_en = 'Emergency Leave' WHERE id = 3;
UPDATE leave_types SET type_name_ar = 'إجازة بدون أجر', type_name_en = 'Unpaid Leave' WHERE id = 4;
UPDATE leave_types SET type_name_ar = 'إجازة حج', type_name_en = 'Hajj Leave' WHERE id = 5;
UPDATE leave_types SET type_name_ar = 'إجازة وضع', type_name_en = 'Maternity Leave' WHERE id = 6;

INSERT INTO lookups (type, code, name_ar, name_en, sort_order, is_active, is_locked) VALUES
('LEAVE_TYPE', '1', 'إجازة سنوية', 'Annual Leave', 1, TRUE, TRUE),
('LEAVE_TYPE', '2', 'إجازة مرضية', 'Sick Leave', 2, TRUE, TRUE),
('LEAVE_TYPE', '3', 'إجازة طارئة', 'Emergency Leave', 3, TRUE, TRUE),
('LEAVE_TYPE', '4', 'إجازة بدون أجر', 'Unpaid Leave', 4, TRUE, TRUE),
('LEAVE_TYPE', '5', 'إجازة حج', 'Hajj Leave', 5, TRUE, TRUE),
('LEAVE_TYPE', '6', 'إجازة وضع', 'Maternity Leave', 6, TRUE, TRUE),
('LEAVE_STATUS', 'PENDING', 'قيد الانتظار', 'Pending', 1, TRUE, TRUE),
('LEAVE_STATUS', 'APPROVED', 'مقبولة', 'Approved', 2, TRUE, TRUE),
('LEAVE_STATUS', 'REJECTED', 'مرفوضة', 'Rejected', 3, TRUE, TRUE),
('LEAVE_STATUS', 'CANCELLED', 'ملغاة', 'Cancelled', 4, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'PENDING', 'غير مدفوعة', 'Pending', 1, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'PENDING_CONFIRMATION', 'بانتظار مراجعة الدفع', 'Pending confirmation', 2, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'PAYMENT_REJECTED', 'إثبات الدفع مرفوض', 'Payment rejected', 3, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'PAID', 'مدفوعة', 'Paid', 4, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'OVERDUE', 'متأخرة', 'Overdue', 5, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'PARTIAL', 'مدفوعة جزئياً', 'Partial', 6, TRUE, TRUE),
('PAYMENT_SCHEDULE_STATUS', 'WAIVED', 'معفاة', 'Waived', 7, TRUE, TRUE),
('EXPENSE_STATUS', 'PENDING', 'قيد الانتظار', 'Pending', 1, TRUE, TRUE),
('EXPENSE_STATUS', 'APPROVED', 'مقبولة', 'Approved', 2, TRUE, TRUE),
('EXPENSE_STATUS', 'REJECTED', 'مرفوضة', 'Rejected', 3, TRUE, TRUE),
('EXPENSE_STATUS', 'PAID', 'مدفوعة', 'Paid', 4, TRUE, TRUE),
('PAYROLL_STATUS', 'DRAFT', 'مسودة', 'Draft', 1, TRUE, TRUE),
('PAYROLL_STATUS', 'SUBMITTED', 'مرسلة', 'Submitted', 2, TRUE, TRUE),
('PAYROLL_STATUS', 'APPROVED', 'مقبولة', 'Approved', 3, TRUE, TRUE),
('PAYROLL_STATUS', 'PAID', 'مدفوعة', 'Paid', 4, TRUE, TRUE),
('PAYROLL_STATUS', 'CANCELLED', 'ملغاة', 'Cancelled', 5, TRUE, TRUE),
('MAINTENANCE_REQUEST_STATUS', 'PENDING', 'قيد الانتظار', 'Pending', 1, TRUE, TRUE),
('MAINTENANCE_REQUEST_STATUS', 'ASSIGNED', 'مُعيّن', 'Assigned', 2, TRUE, TRUE),
('MAINTENANCE_REQUEST_STATUS', 'SCHEDULED', 'مجدول', 'Scheduled', 3, TRUE, TRUE),
('MAINTENANCE_REQUEST_STATUS', 'IN_PROGRESS', 'قيد التنفيذ', 'In progress', 4, TRUE, TRUE),
('MAINTENANCE_REQUEST_STATUS', 'COMPLETED', 'مكتمل', 'Completed', 5, TRUE, TRUE),
('MAINTENANCE_REQUEST_STATUS', 'CANCELLED', 'ملغى', 'Cancelled', 6, TRUE, TRUE),
('COMPLAINT_TYPE', 'NEIGHBOR_NOISE', 'إزعاج الجيران', 'Neighbor noise', 1, TRUE, FALSE),
('COMPLAINT_TYPE', 'COMMON_AREA', 'المناطق المشتركة', 'Common area', 2, TRUE, FALSE),
('COMPLAINT_TYPE', 'CLEANLINESS', 'النظافة', 'Cleanliness', 3, TRUE, FALSE),
('COMPLAINT_STATUS', 'OPEN', 'مفتوحة', 'Open', 1, TRUE, TRUE),
('COMPLAINT_STATUS', 'IN_REVIEW', 'قيد المراجعة', 'In review', 2, TRUE, TRUE),
('COMPLAINT_STATUS', 'RESOLVED', 'محلولة', 'Resolved', 3, TRUE, TRUE),
('COMPLAINT_STATUS', 'CLOSED', 'مغلقة', 'Closed', 4, TRUE, TRUE),
('COMPLAINT_PRIORITY', 'LOW', 'منخفضة', 'Low', 1, TRUE, TRUE),
('COMPLAINT_PRIORITY', 'NORMAL', 'عادية', 'Normal', 2, TRUE, TRUE),
('COMPLAINT_PRIORITY', 'HIGH', 'عالية', 'High', 3, TRUE, TRUE),
('COMPLAINT_PRIORITY', 'URGENT', 'عاجلة', 'Urgent', 4, TRUE, TRUE)
ON CONFLICT (type, code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    is_locked = TRUE;
