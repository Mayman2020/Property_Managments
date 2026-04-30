package com.propertymanagement.modules.moduleconfig.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PropertyModuleSettingResponse {
    private Long propertyId;
    private String moduleKey;
    private boolean enabled;
}
