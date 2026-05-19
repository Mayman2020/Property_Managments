package com.propertymanagement.modules.reports.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class ContractExpiryRow {
    private Long contractId;
    private String contractNumber;
    private Long propertyId;
    private String propertyName;
    private Long unitId;
    private String unitNumber;
    private Long tenantId;
    private String tenantName;
    private LocalDate startDate;
    private LocalDate endDate;
    private long daysRemaining;
    private BigDecimal monthlyRent;
    private String status;
}
