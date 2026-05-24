package com.propertymanagement.modules.inspection.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class LinkDamagesResponse {
    private BigDecimal totalDeduction;
    private BigDecimal depositAmount;
    private BigDecimal remainingDeposit;
}
