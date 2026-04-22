package com.propertymanagement.modules.maintenance.visit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VisitReportItemRepository extends JpaRepository<VisitReportItem, Long> {
    List<VisitReportItem> findByVisitReportId(Long visitReportId);
}
