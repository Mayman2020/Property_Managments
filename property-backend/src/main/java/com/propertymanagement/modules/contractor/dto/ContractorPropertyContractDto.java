package com.propertymanagement.modules.contractor.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ContractorPropertyContractDto {
    private Long contractId;
    private String contractNumber;
    private Long propertyId;
    private String propertyNameAr;
    private String propertyNameEn;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Integer slaHours;
    private BigDecimal contractValue;
    private LocalDateTime createdAt;
}
