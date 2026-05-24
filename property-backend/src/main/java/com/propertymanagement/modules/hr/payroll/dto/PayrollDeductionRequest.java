package com.propertymanagement.modules.hr.payroll.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class PayrollDeductionRequest {
    @NotNull
    private Long employeeId;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    @NotBlank
    private String reason;

    @NotNull
    private LocalDate deductionDate;

    @NotBlank
    @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])")
    private String payrollMonth;
}
