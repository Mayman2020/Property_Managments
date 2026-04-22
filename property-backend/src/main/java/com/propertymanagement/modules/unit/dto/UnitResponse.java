package com.propertymanagement.modules.unit.dto;

import com.propertymanagement.modules.unit.UnitType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class UnitResponse {
    private Long id;
    private Long propertyId;
    private Long floorId;
    private String unitNumber;
    private UnitType unitType;
    private BigDecimal areaSqm;
    private Integer bedrooms;
    private Integer bathrooms;
    private boolean rented;
    private BigDecimal rentAmount;
    private String currency;
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
