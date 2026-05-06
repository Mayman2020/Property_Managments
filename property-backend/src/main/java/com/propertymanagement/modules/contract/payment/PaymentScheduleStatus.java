package com.propertymanagement.modules.contract.payment;

public enum PaymentScheduleStatus {
    PENDING,
    PENDING_CONFIRMATION,
    PAYMENT_REJECTED,
    PAID,
    OVERDUE,
    PARTIAL,
    WAIVED
}
