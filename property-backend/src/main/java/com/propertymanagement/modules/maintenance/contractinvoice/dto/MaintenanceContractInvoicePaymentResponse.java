package com.propertymanagement.modules.maintenance.contractinvoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MaintenanceContractInvoicePaymentResponse(
        Long id,
        Long invoiceId,
        Integer installmentNo,
        BigDecimal amount,
        LocalDate dueDate,
        LocalDate paidDate,
        String receiptUrl,
        String status,
        String notes
) {}
