package com.propertymanagement.modules.moduleconfig;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModulePresetItemRepository extends JpaRepository<ModulePresetItem, Long> {
    List<ModulePresetItem> findByPresetCode(String presetCode);
}
