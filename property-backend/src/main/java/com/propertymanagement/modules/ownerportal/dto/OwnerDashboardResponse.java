package com.propertymanagement.modules.ownerportal.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class OwnerDashboardResponse {
    private long totalProperties;
    private BigDecimal totalRevenue;
    private BigDecimal totalExpenses;
    private BigDecimal ownerNetAmount;
}
