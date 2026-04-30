package com.propertymanagement.modules.hr.payroll.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PayslipAdjustRequest {
    private BigDecimal overtimeAmount;
    private BigDecimal absenceDeduction;
    private BigDecimal lateDeduction;
    private BigDecimal penaltyDeduction;
    private BigDecimal insuranceDeduction;
    private BigDecimal otherDeductions;
    private String notes;
}
