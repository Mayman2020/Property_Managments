package com.propertymanagement.modules.LookupEntity.repository;

import com.propertymanagement.modules.LookupEntity.entity.LookupEntity;
import com.propertymanagement.modules.LookupEntity.entity.LookupType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LookupRepository extends JpaRepository<LookupEntity, Long> {
    List<LookupEntity> findByTypeAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType type);
    List<LookupEntity> findByTypeOrderBySortOrderAscNameEnAsc(LookupType type);
    List<LookupEntity> findByTypeAndParentIdAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType type, Long parentId);
    Optional<LookupEntity> findByTypeAndCodeIgnoreCase(LookupType type, String code);
    boolean existsByTypeAndCodeIgnoreCase(LookupType type, String code);

    long countByType(LookupType type);

    long countByTypeAndParentId(LookupType type, Long parentId);
}
