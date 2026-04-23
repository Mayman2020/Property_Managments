package com.propertymanagement.modules.permission.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScreenSettingResponse {
    private String screenKey;
    private boolean globallyEnabled;
}
