package com.propertymanagement.modules.unit.dto;

import com.propertymanagement.modules.unit.UnitType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UnitRequest {
    @NotNull
    private Long propertyId;
    private Long floorId;
    @NotBlank
    private String unitNumber;
    @NotNull
    private UnitType unitType;
    private BigDecimal areaSqm;
    private Integer bedrooms;
    private Integer bathrooms;
    private BigDecimal rentAmount;
    private String currency = "SAR";
    private String notes;
}
