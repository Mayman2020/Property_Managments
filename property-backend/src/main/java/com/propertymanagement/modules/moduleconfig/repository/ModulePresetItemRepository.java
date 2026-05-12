package com.propertymanagement.modules.moduleconfig.repository;

import com.propertymanagement.modules.moduleconfig.entity.ModulePresetItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModulePresetItemRepository extends JpaRepository<ModulePresetItemEntity, Long> {
    List<ModulePresetItemEntity> findByPresetCode(String presetCode);
}
