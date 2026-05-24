package com.propertymanagement.modules.inspection.repository;

import com.propertymanagement.modules.inspection.entity.InspectionStatus;
import com.propertymanagement.modules.inspection.entity.InspectionType;
import com.propertymanagement.modules.inspection.entity.UnitInspection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnitInspectionRepository extends JpaRepository<UnitInspection, Long> {

    List<UnitInspection> findByContractIdOrderByCreatedAtDesc(Long contractId);

    boolean existsByContractIdAndInspectionTypeAndStatus(
            Long contractId, InspectionType inspectionType, InspectionStatus status);

    Optional<UnitInspection> findFirstByContractIdAndInspectionTypeAndStatusOrderByCreatedAtDesc(
            Long contractId, InspectionType inspectionType, InspectionStatus status);
}
