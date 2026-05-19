package com.propertymanagement.modules.contract.lease.dto;

import lombok.Data;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Data
public class ReportDamagesDto {
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;
    private String notes;
}
