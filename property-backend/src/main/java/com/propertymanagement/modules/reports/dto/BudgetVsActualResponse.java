package com.propertymanagement.modules.reports.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class BudgetVsActualResponse {
    private BigDecimal totalBudgeted;
    private BigDecimal totalActual;
    private BigDecimal totalVariance;
    private double utilizationPercent;
    private List<CategoryRow> rows;

    @Getter
    @Builder
    public static class CategoryRow {
        private Long budgetId;
        private Long propertyId;
        private String categoryName;
        private BigDecimal budgetedAmount;
        private BigDecimal actualAmount;
        private BigDecimal variance;
        private double utilizationPercent;
        private boolean overBudget;
    }
}
