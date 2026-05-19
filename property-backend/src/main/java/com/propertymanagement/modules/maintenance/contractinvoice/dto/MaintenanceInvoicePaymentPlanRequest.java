package com.propertymanagement.modules.maintenance.contractinvoice.dto;

import java.time.LocalDate;
import java.util.List;

public record MaintenanceInvoicePaymentPlanRequest(
        String mode,
        String receiptUrl,
        String notes,
        Integer installmentCount,
        List<InstallmentDueDateRequest> installments
) {
    public record InstallmentDueDateRequest(
            Integer installmentNo,
            LocalDate dueDate
    ) {}
}
