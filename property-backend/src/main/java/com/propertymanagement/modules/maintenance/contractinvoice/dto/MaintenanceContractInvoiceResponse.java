package com.propertymanagement.modules.maintenance.contractinvoice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MaintenanceContractInvoiceResponse(
        Long invoiceId,
        String invoiceNumber,
        Long contractId,
        String contractNumber,
        Long contractorCompanyId,
        String contractorCompanyName,
        String contractorCompanyNameAr,
        String contractorCompanyNameEn,
        Long propertyId,
        Integer invoiceMonth,
        Integer invoiceYear,
        BigDecimal amount,
        LocalDate dueDate,
        LocalDate paidDate,
        String receiptUrl,
        String status,
        String notes,
        String descriptionAr,
        String descriptionEn,
        LocalDateTime createdAt,
        List<MaintenanceContractInvoicePaymentResponse> payments,
        BigDecimal paidAmount,
        BigDecimal remainingAmount,
        Integer installmentCount,
        Integer paidInstallmentCount
) {}
