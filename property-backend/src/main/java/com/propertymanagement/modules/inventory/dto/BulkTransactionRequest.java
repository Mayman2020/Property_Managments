package com.propertymanagement.modules.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BulkTransactionRequest {
    @NotNull
    private Long itemId;
    @NotBlank
    private String transactionType; // IN or OUT
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal quantity;
    private String notes;
    private Long requestId;
}
