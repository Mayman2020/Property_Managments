package com.propertymanagement.modules.maintenance.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceContractRepository extends JpaRepository<MaintenanceContract, Long> {

    List<MaintenanceContract> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    List<MaintenanceContract> findByContractorCompanyIdOrderByCreatedAtDesc(Long contractorCompanyId);

    Optional<MaintenanceContract> findByAssignmentId(Long assignmentId);

    boolean existsByContractNumber(String contractNumber);

    long countByContractNumberStartingWith(String prefix);
}
