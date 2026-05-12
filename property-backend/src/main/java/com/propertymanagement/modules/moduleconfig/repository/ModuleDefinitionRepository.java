package com.propertymanagement.modules.moduleconfig.repository;

import com.propertymanagement.modules.moduleconfig.entity.ModuleDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleDefinitionRepository extends JpaRepository<ModuleDefinitionEntity, String> {
    List<ModuleDefinitionEntity> findByActiveTrueOrderByDisplayOrderAscModuleKeyAsc();
}
