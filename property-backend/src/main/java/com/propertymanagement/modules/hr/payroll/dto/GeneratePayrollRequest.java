package com.propertymanagement.modules.hr.payroll.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GeneratePayrollRequest {
    private Long propertyId;
    @NotNull
    @Min(2000)
    @Max(2100)
    private Integer payPeriodYear;
    @NotNull
    @Min(1)
    @Max(12)
    private Integer payPeriodMonth;
}
