package com.propertymanagement.modules.user.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OwnerPropertyBriefDto {
    private Long id;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private String propertyCode;
}
