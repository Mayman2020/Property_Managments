package com.propertymanagement.modules.moduleconfig.repository;

import com.propertymanagement.modules.moduleconfig.entity.PropertyModuleSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PropertyModuleSettingRepository extends JpaRepository<PropertyModuleSettingEntity, Long> {
    List<PropertyModuleSettingEntity> findByPropertyIdOrderByModuleKeyAsc(Long propertyId);
    Optional<PropertyModuleSettingEntity> findByPropertyIdAndModuleKey(Long propertyId, String moduleKey);
}
