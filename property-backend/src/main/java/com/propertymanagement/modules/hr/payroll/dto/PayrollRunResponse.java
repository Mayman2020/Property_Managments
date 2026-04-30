package com.propertymanagement.modules.hr.payroll.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class PayrollRunResponse {
    private Long id;
    private Long propertyId;
    private Integer payPeriodYear;
    private Integer payPeriodMonth;
    private LocalDate payDate;
    private String status;
    private BigDecimal totalBasic;
    private BigDecimal totalAllowances;
    private BigDecimal totalDeductions;
    private BigDecimal totalBonuses;
    private BigDecimal totalNet;
}
