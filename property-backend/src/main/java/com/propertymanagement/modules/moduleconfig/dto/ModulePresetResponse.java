package com.propertymanagement.modules.moduleconfig.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class ModulePresetResponse {
    private String presetCode;
    private String presetNameAr;
    private String presetNameEn;
    private String descriptionAr;
    private String descriptionEn;
    private Integer displayOrder;
    private Map<String, Boolean> modules;
}
