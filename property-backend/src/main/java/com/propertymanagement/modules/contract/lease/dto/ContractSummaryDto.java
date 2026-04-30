package com.propertymanagement.modules.contract.lease.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder
public class ContractSummaryDto {
    private Long id;
    private String contractNumber;
    private Long tenantId;
    private String tenantName;
    private Long unitId;
    private String unitNumber;
    private String propertyName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal monthlyRent;
    private String currency;
    private String status;
    private long daysUntilExpiry;
}
