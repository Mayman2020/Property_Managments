package com.propertymanagement.modules.maintenance.assignment.dto;

import java.time.LocalDate;

public record AssignMaintenanceRequest(
        String providerType,          // USER | COMPANY
        Long userId,                  // required when providerType=USER
        Long companyId,               // required when providerType=COMPANY
        boolean isPrimary,
        LocalDate startDate,
        String notes,
        ContractDataRequest contract  // optional; used only for COMPANY provider
) {}
