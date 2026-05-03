package com.propertymanagement.modules.maintenance.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceContractRepository extends JpaRepository<MaintenanceContract, Long> {

    List<MaintenanceContract> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    List<MaintenanceContract> findByContractorCompanyIdOrderByCreatedAtDesc(Long contractorCompanyId);

    Optional<MaintenanceContract> findByAssignmentId(Long assignmentId);

    boolean existsByContractNumber(String contractNumber);

    long countByContractNumberStartingWith(String prefix);

    /**
     * Ongoing maintenance agreement with a property: status ACTIVE and the date window includes {@code today}
     * (open-ended when {@code endDate} is null).
     */
    @Query("""
            SELECT COUNT(mc) > 0 FROM MaintenanceContract mc
            INNER JOIN Property p ON p.id = mc.propertyId
            WHERE mc.contractorCompanyId = :companyId
              AND mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
            """)
    boolean existsActiveOngoingForContractorOnProperty(
            @Param("companyId") Long companyId,
            @Param("today") LocalDate today);
}
