package com.propertymanagement.modules.ownerportal.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OwnerRevenueShareResponse {
    private Long id;
    private Long ownerId;
    private String ownerName;
    private Long propertyId;
    private String propertyName;
    private Long rentPaymentId;
    private BigDecimal amount;
    private BigDecimal percentage;
    private Integer month;
    private Integer year;
}
