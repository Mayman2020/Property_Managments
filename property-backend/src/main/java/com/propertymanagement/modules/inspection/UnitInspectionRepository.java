package com.propertymanagement.modules.inspection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UnitInspectionRepository extends JpaRepository<UnitInspection, Long> {
    List<UnitInspection> findByUnitId(Long unitId);
    List<UnitInspection> findByContractId(Long contractId);
}
