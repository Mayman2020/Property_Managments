package com.propertymanagement.modules.property.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FloorResponse {
    private Long id;
    private Long propertyId;
    private Integer floorNumber;
    private String floorLabel;
}
