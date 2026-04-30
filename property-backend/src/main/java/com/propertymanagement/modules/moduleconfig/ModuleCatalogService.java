package com.propertymanagement.modules.moduleconfig;

import com.propertymanagement.modules.moduleconfig.dto.ModuleDefinitionResponse;
import com.propertymanagement.modules.moduleconfig.dto.ModulePresetResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ModuleCatalogService {

    private final ModuleDefinitionRepository moduleDefinitionRepository;
    private final ModulePresetRepository modulePresetRepository;
    private final ModulePresetItemRepository modulePresetItemRepository;

    public List<ModuleDefinitionResponse> getDefinitions() {
        return moduleDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscModuleKeyAsc().stream()
                .map(item -> ModuleDefinitionResponse.builder()
                        .moduleKey(item.getModuleKey())
                        .titleAr(item.getTitleAr())
                        .titleEn(item.getTitleEn())
                        .descriptionAr(item.getDescriptionAr())
                        .descriptionEn(item.getDescriptionEn())
                        .icon(item.getIcon())
                        .requiredModules(item.getRequiredModules())
                        .recommendedModules(item.getRecommendedModules())
                        .monthlyPrice(item.getMonthlyPrice())
                        .displayOrder(item.getDisplayOrder())
                        .build())
                .toList();
    }

    public List<ModulePresetResponse> getPresets() {
        return modulePresetRepository.findByActiveTrueOrderByDisplayOrderAscPresetCodeAsc().stream()
                .map(preset -> {
                    Map<String, Boolean> modules = new LinkedHashMap<>();
                    modulePresetItemRepository.findByPresetCode(preset.getPresetCode())
                            .forEach(item -> modules.put(item.getModuleKey(), item.isEnabled()));
                    return ModulePresetResponse.builder()
                            .presetCode(preset.getPresetCode())
                            .presetNameAr(preset.getPresetNameAr())
                            .presetNameEn(preset.getPresetNameEn())
                            .descriptionAr(preset.getDescriptionAr())
                            .descriptionEn(preset.getDescriptionEn())
                            .displayOrder(preset.getDisplayOrder())
                            .modules(modules)
                            .build();
                })
                .toList();
    }
}
