package com.propertymanagement.modules.property.dto;

import com.propertymanagement.modules.property.PropertyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PropertyRequest {
    @NotBlank
    private String propertyName;
    @NotBlank
    private String propertyCode;
    @NotNull
    private PropertyType propertyType;
    @NotBlank
    private String address;
    private String city;
    private String country;
    private Integer totalFloors = 1;
    private Integer totalUnits = 0;
    private String description;
    private String coverImageUrl;
    private Long ownerId;
}
