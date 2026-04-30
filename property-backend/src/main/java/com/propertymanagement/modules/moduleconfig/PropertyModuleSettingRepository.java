package com.propertymanagement.modules.moduleconfig;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyModuleSettingRepository extends JpaRepository<PropertyModuleSetting, Long> {
    List<PropertyModuleSetting> findByPropertyIdOrderByModuleKeyAsc(Long propertyId);
    Optional<PropertyModuleSetting> findByPropertyIdAndModuleKey(Long propertyId, String moduleKey);
}
