package com.propertymanagement.modules.finance.expense.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class ExpenseResponse {
    private Long id;
    private String expenseNumber;
    private String description;
    private BigDecimal amount;
    private String currency;
    private LocalDate expenseDate;
    private String status;
    private String categoryName;
}
