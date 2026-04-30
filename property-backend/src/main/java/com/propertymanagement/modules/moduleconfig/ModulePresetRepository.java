package com.propertymanagement.modules.moduleconfig;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModulePresetRepository extends JpaRepository<ModulePreset, String> {
    List<ModulePreset> findByActiveTrueOrderByDisplayOrderAscPresetCodeAsc();
}
