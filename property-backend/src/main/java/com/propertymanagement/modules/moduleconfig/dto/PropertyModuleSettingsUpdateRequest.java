package com.propertymanagement.modules.moduleconfig.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class PropertyModuleSettingsUpdateRequest {
    @NotNull
    private Map<String, Boolean> modules;
}
