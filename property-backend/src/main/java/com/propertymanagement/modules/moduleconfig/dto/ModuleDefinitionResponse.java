package com.propertymanagement.modules.moduleconfig.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ModuleDefinitionResponse {
    private String moduleKey;
    private String titleAr;
    private String titleEn;
    private String descriptionAr;
    private String descriptionEn;
    private String icon;
    private List<String> requiredModules;
    private List<String> recommendedModules;
    private Integer displayOrder;
}
