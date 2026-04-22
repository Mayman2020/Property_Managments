package com.propertymanagement.modules.lookup;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LookupRepository extends JpaRepository<Lookup, Long> {
    List<Lookup> findByTypeAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType type);
    List<Lookup> findByTypeAndParentIdAndActiveTrueOrderBySortOrderAscNameEnAsc(LookupType type, Long parentId);
    Optional<Lookup> findByTypeAndCodeIgnoreCase(LookupType type, String code);
    boolean existsByTypeAndCodeIgnoreCase(LookupType type, String code);
}
