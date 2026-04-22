package com.propertymanagement.modules.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class InventoryItemResponse {
    private Long id;
    private Long propertyId;
    private String itemCode;
    private String itemNameAr;
    private String itemNameEn;
    private String unitOfMeasure;
    private BigDecimal quantity;
    private BigDecimal minQuantity;
    private String location;
    private boolean lowStock;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
