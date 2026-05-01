package com.propertymanagement.modules.maintenance.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyMaintenanceAssignmentRepository extends JpaRepository<PropertyMaintenanceAssignment, Long> {

    List<PropertyMaintenanceAssignment> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    List<PropertyMaintenanceAssignment> findByPropertyIdAndStatusOrderByCreatedAtDesc(Long propertyId, String status);

    @Query("SELECT a FROM PropertyMaintenanceAssignment a WHERE a.propertyId = :propertyId AND a.isPrimary = true AND a.status = 'ACTIVE'")
    Optional<PropertyMaintenanceAssignment> findActivePrimaryByPropertyId(@Param("propertyId") Long propertyId);

    Optional<PropertyMaintenanceAssignment> findByIdAndPropertyId(Long id, Long propertyId);

    @Query("SELECT a FROM PropertyMaintenanceAssignment a WHERE a.propertyId = :propertyId AND a.maintenanceProviderId = :providerId AND a.status = 'ACTIVE'")
    Optional<PropertyMaintenanceAssignment> findActiveByPropertyAndProvider(@Param("propertyId") Long propertyId, @Param("providerId") Long providerId);
}
