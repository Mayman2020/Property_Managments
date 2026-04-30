package com.propertymanagement.modules.hr.payroll.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class SalaryAdvanceRequest {
    @NotNull
    private Long employeeId;
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;
    @NotNull
    private LocalDate requestDate;
    private String reason;
    @NotNull
    private Integer deductedYear;
    @NotNull
    private Integer deductedMonth;
    private String notes;
}
