package com.propertymanagement.modules.ownerportal.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UnitOptionDto {
    private Long id;
    private String unitNumber;
    private Long propertyId;
    private String propertyName;
}
