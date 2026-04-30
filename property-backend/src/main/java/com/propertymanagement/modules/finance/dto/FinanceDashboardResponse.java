package com.propertymanagement.modules.finance.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class FinanceDashboardResponse {
    private BigDecimal thisMonthCollected;
    private BigDecimal thisMonthExpenses;
    private BigDecimal netIncome;
    private BigDecimal overdueAmount;
    private BigDecimal budgetUtilizationPct;
}
