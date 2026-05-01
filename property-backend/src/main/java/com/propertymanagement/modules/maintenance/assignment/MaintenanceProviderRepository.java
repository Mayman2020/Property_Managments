package com.propertymanagement.modules.maintenance.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaintenanceProviderRepository extends JpaRepository<MaintenanceProvider, Long> {
    Optional<MaintenanceProvider> findByUserId(Long userId);
    Optional<MaintenanceProvider> findByCompanyId(Long companyId);
    boolean existsByUserId(Long userId);
    boolean existsByCompanyId(Long companyId);
}
