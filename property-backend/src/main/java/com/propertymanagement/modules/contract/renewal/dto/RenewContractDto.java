package com.propertymanagement.modules.contract.renewal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RenewContractDto {

    @NotNull
    private LocalDate newStartDate;

    @NotNull
    private LocalDate newEndDate;

    @NotNull
    @Positive
    private BigDecimal newMonthlyRent;

    @Min(0) @Max(12)
    private Integer freeMonths = 0;

    private BigDecimal newSecurityDeposit;

    private String notes;

    private String contractPdfUrl;
}
