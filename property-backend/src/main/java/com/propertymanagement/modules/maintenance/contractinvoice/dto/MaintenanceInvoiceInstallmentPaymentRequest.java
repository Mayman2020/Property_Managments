package com.propertymanagement.modules.maintenance.contractinvoice.dto;

public record MaintenanceInvoiceInstallmentPaymentRequest(
        String receiptUrl,
        String notes
) {}
