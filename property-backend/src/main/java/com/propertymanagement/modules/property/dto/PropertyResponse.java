package com.propertymanagement.modules.property.dto;

import com.propertymanagement.modules.property.PropertyType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PropertyResponse {
    private Long id;
    private Long ownerId;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private String propertyCode;
    private PropertyType propertyType;
    private String address;
    private String city;
    private String country;
    private String googleMapUrl;
    private Integer totalFloors;
    private Integer totalUnits;
    private String description;
    private String coverImageUrl;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
