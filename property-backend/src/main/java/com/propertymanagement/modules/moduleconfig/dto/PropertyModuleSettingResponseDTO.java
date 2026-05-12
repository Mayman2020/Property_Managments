package com.propertymanagement.modules.moduleconfig.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PropertyModuleSettingResponseDTO {
    private Long propertyId;
    private String moduleKey;
    private boolean enabled;
}
