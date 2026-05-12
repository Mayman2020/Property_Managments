package com.propertymanagement.modules.unit.dto;

import com.propertymanagement.modules.unit.entity.UnitType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.propertymanagement.modules.property.entity.Floor;

@Data
@Builder
public class UnitResponse {
    private Long id;
    private Long propertyId;
    private Long floorId;
    /** Human-readable floor index (1-based), from {@code floors.floor_number}; not the floor row id. */
    private Integer floorNumber;
    private String unitNumber;
    private UnitType unitType;
    private String furnishedStatus;
    private BigDecimal areaSqm;
    private Integer bedrooms;
    private Integer bathrooms;
    private boolean rented;
    private boolean reserved;
    private BigDecimal rentAmount;
    private String currency;
    private String notes;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;
}
