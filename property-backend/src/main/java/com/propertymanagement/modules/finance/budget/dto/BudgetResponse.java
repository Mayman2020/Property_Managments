package com.propertymanagement.modules.finance.budget.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class BudgetResponse {
    private Long id;
    private Long propertyId;
    private String propertyName;
    private Long categoryId;
    private String categoryName;
    private String categoryNameAr;
    private String categoryNameEn;
    private Long financialPeriodId;
    private String periodName;
    private BigDecimal budgetedAmount;
    private BigDecimal actualAmount;
    private BigDecimal variance;
    private Double utilizationPercent;
    private Boolean overBudget;
}
