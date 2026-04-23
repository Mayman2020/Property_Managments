package com.propertymanagement.modules.permission.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScreenSettingUpdateRequest {
    @NotNull
    private Boolean globallyEnabled;
}
