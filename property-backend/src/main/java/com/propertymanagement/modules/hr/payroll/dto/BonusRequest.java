package com.propertymanagement.modules.hr.payroll.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BonusRequest {
    @NotNull
    private Long employeeId;
    @NotBlank
    private String bonusType;
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;
    private String reason;
}
