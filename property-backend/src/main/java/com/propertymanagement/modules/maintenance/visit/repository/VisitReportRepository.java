package com.propertymanagement.modules.maintenance.visit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.propertymanagement.modules.maintenance.visit.entity.VisitReport;

import java.util.Optional;

@Repository
public interface VisitReportRepository extends JpaRepository<VisitReport, Long> {
    Optional<VisitReport> findByRequestId(Long requestId);
    boolean existsByRequestId(Long requestId);
}
