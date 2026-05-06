package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ContractRenewalRequestDto {
    @NotNull
    private LocalDate proposedStartDate;

    @NotNull
    private LocalDate proposedEndDate;

    @NotNull
    @Positive
    private BigDecimal proposedRentAmount;

    private String note;

    @AssertTrue(message = "proposedEndDate must be after proposedStartDate")
    public boolean isDateRangeValid() {
        if (proposedStartDate == null || proposedEndDate == null) {
            return true;
        }
        return proposedEndDate.isAfter(proposedStartDate);
    }
}
