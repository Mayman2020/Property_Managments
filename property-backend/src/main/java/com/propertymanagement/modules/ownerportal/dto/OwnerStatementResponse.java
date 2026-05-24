package com.propertymanagement.modules.ownerportal.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class OwnerStatementResponse {
    private Long id;
    private String propertyName;
    private Integer statementMonth;
    private Integer statementYear;
    private BigDecimal totalRevenue;
    private BigDecimal totalExpenses;
    private BigDecimal ownerNetAmount;
    private java.math.BigDecimal ownershipPercentage;
    private String status;
    private String pdfUrl;
}
