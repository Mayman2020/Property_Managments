package com.propertymanagement.modules.moduleconfig;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModuleDefinitionRepository extends JpaRepository<ModuleDefinition, String> {
    List<ModuleDefinition> findByActiveTrueOrderByDisplayOrderAscModuleKeyAsc();
}
