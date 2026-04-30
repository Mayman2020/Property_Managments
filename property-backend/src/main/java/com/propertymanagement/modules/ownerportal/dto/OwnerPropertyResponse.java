package com.propertymanagement.modules.ownerportal.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OwnerPropertyResponse {
    private Long id;
    private String propertyName;
    private String propertyCode;
    private Integer totalUnits;
    private Integer occupiedUnits;
}
