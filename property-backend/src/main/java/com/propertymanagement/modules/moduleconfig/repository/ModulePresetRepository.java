package com.propertymanagement.modules.moduleconfig.repository;

import com.propertymanagement.modules.moduleconfig.entity.ModulePresetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModulePresetRepository extends JpaRepository<ModulePresetEntity, String> {
    List<ModulePresetEntity> findByActiveTrueOrderByDisplayOrderAscPresetCodeAsc();
}
