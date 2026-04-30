package com.propertymanagement.modules.finance.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class FinancialReportRowResponse {
    private String propertyName;
    private Integer year;
    private Integer month;
    private BigDecimal totalRevenue;
    private BigDecimal totalExpenses;
    private BigDecimal netIncome;
    private BigDecimal cashIn;
    private BigDecimal cashOut;
    private String ownerName;
    private Integer statementMonth;
    private Integer statementYear;
    private BigDecimal ownerNetAmount;
}
