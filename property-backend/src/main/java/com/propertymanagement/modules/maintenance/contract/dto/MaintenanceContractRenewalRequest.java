package com.propertymanagement.modules.maintenance.contract.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class MaintenanceContractRenewalRequest {
    @NotNull
    private LocalDate proposedStartDate;
    @NotNull
    private LocalDate proposedEndDate;
    private BigDecimal proposedValue;
    private String note;
}
