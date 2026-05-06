package com.propertymanagement.modules.contract.renewal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class RenewalChainContractDto {
    private Long id;
    private String contractNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Integer freeMonths;
    private Boolean hasFreeMonth;
}
