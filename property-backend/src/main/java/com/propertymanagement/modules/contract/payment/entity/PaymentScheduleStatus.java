package com.propertymanagement.modules.contract.payment.entity;

public enum PaymentScheduleStatus {
    PENDING,
    PENDING_CONFIRMATION,
    PAYMENT_REJECTED,
    PAID,
    OVERDUE,
    PARTIAL,
    WAIVED
}
