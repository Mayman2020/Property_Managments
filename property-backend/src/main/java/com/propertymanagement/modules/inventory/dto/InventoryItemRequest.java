package com.propertymanagement.modules.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryItemRequest {
    private Long propertyId;
    @NotBlank
    private String itemCode;
    @NotBlank
    private String itemNameAr;
    private String itemNameEn;
    private String unitOfMeasure;
    private BigDecimal quantity = BigDecimal.ZERO;
    private BigDecimal minQuantity = BigDecimal.ZERO;
    private String location;
}
