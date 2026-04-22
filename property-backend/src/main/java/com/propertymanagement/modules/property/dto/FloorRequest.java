package com.propertymanagement.modules.property.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FloorRequest {
    @NotNull
    private Integer floorNumber;
    private String floorLabel;
}
