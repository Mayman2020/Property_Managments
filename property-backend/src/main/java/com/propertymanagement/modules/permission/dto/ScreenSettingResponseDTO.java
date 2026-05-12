package com.propertymanagement.modules.permission.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScreenSettingResponseDTO {
    private String screenKey;
    private boolean globallyEnabled;
}
