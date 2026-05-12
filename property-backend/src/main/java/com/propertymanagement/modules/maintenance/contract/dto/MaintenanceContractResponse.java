package com.propertymanagement.modules.maintenance.contract.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MaintenanceContractResponse(
        Long contractId,
        Long propertyId,
        Long contractorCompanyId,
        String contractorCompanyName,
        String contractorCompanyNameAr,
        String contractorCompanyNameEn,
        Long assignmentId,
        String contractNumber,
        LocalDate startDate,
        LocalDate endDate,
        Integer slaHours,
        BigDecimal contractValue,
        String status,
        String notes,
        LocalDateTime createdAt,
        int invoiceCount,
        Long previousContractId,
        String ownerApprovalStatus,
        String ownerApprovalNotes,
        LocalDate terminationProposedDate,
        String terminationRequestNotes,
        LocalDate renewalProposedStartDate,
        LocalDate renewalProposedEndDate,
        BigDecimal renewalProposedValue,
        String renewalRequestedNote,
        String renewalDecisionStatus
) {}
