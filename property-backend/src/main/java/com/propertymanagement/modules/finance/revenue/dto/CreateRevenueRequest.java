package com.propertymanagement.modules.finance.revenue.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateRevenueRequest {
    @NotNull
    private Long propertyId;
    @NotBlank
    private String description;
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;
    private String currency = "OMR";
    @NotBlank
    private String revenueDate;
    private Long categoryId;
}
