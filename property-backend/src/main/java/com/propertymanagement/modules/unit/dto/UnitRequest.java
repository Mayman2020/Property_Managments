package com.propertymanagement.modules.unit.dto;

import com.propertymanagement.modules.unit.entity.UnitType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UnitRequest {
    @NotNull
    private Long propertyId;
    private Long floorId;
    @NotNull
    private UnitType unitType;
    @NotBlank
    private String furnishedStatus;
    private BigDecimal areaSqm;
    private Integer bedrooms;
    private Integer bathrooms;
    private BigDecimal rentAmount;
    private String currency = "OMR";
    private String notes;
}
