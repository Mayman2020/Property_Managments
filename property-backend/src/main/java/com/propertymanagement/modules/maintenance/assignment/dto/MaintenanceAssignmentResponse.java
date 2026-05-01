package com.propertymanagement.modules.maintenance.assignment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MaintenanceAssignmentResponse(
        Long assignmentId,
        Long propertyId,
        String status,
        boolean isPrimary,
        LocalDate startDate,
        LocalDate endDate,
        String notes,
        LocalDateTime createdAt,

        // Provider info
        Long providerId,
        String providerType,     // USER | COMPANY

        // User info (when providerType=USER)
        Long userId,
        String userFullName,
        String userEmail,
        String userRole,

        // Company info (when providerType=COMPANY)
        Long companyId,
        String companyName,
        String companyNameAr,
        String companyNameEn,
        String companyPhone,
        String companyEmail,

        // Contract info (when providerType=COMPANY and contract exists)
        ContractInfo contract
) {
    public record ContractInfo(
            Long contractId,
            String contractNumber,
            LocalDate startDate,
            LocalDate endDate,
            Integer slaHours,
            BigDecimal contractValue,
            String status
    ) {}
}
