package com.propertymanagement.modules.finance.revenue.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class OtherRevenueResponse {
    private Long id;
    private String revenueNumber;
    private String description;
    private BigDecimal amount;
    private String currency;
    private LocalDate revenueDate;
    private String categoryName;
}
