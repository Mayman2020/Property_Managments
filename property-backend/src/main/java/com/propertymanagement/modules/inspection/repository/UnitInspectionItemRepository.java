package com.propertymanagement.modules.inspection.repository;

import com.propertymanagement.modules.inspection.entity.UnitInspectionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UnitInspectionItemRepository extends JpaRepository<UnitInspectionItem, Long> {

    List<UnitInspectionItem> findByInspectionIdOrderByIdAsc(Long inspectionId);
}
