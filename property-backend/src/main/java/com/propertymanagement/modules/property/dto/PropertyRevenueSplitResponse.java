package com.propertymanagement.modules.property.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PropertyRevenueSplitResponse {
    private Long propertyId;
    private String propertyName;
    private Integer year;
    private Integer month;
    private BigDecimal totalRentCollected;
    private List<OwnerSplitRow> owners;

    @Data
    @Builder
    public static class OwnerSplitRow {
        private Long ownerId;
        private String ownerName;
        private BigDecimal ownershipPercentage;
        private BigDecimal shareAmount;
    }
}
