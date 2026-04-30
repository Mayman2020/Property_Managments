package com.propertymanagement.modules.hr.payroll.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class PayslipResponse {
    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String jobTitle;
    private BigDecimal basicSalary;
    private BigDecimal housingAllowance;
    private BigDecimal transportAllowance;
    private BigDecimal otherAllowances;
    private BigDecimal overtimeAmount;
    private BigDecimal bonusAmount;
    private BigDecimal totalEarnings;
    private BigDecimal advanceDeduction;
    private BigDecimal absenceDeduction;
    private BigDecimal lateDeduction;
    private BigDecimal penaltyDeduction;
    private BigDecimal insuranceDeduction;
    private BigDecimal otherDeductions;
    private BigDecimal totalDeductions;
    private BigDecimal netSalary;
    private Boolean paid;
    private LocalDate paidDate;
    private String paymentMethod;
    private String referenceNumber;
    private String notes;
}
