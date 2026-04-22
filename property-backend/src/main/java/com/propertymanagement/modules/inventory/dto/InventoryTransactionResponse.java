package com.propertymanagement.modules.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class InventoryTransactionResponse {
    private Long id;
    private Long itemId;
    private String transactionType;
    private BigDecimal quantity;
    private String notes;
    private Long requestId;
    private Long performedBy;
    private LocalDateTime createdAt;
}
