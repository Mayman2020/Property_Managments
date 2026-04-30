package com.propertymanagement.modules.finance.pettycash.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PettyCashFundResponse {
    private Long id;
    private String fundName;
    private BigDecimal openingBalance;
    private BigDecimal currentBalance;
    private BigDecimal maxTransaction;
}
