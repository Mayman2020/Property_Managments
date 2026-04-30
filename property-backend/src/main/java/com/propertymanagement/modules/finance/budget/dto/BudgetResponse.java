package com.propertymanagement.modules.finance.budget.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class BudgetResponse {
    private Long id;
    private Long propertyId;
    private String categoryName;
    private BigDecimal budgetedAmount;
}
