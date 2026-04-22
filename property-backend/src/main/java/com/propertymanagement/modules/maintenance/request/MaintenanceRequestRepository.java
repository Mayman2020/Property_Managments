package com.propertymanagement.modules.maintenance.request;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {

    Optional<MaintenanceRequest> findByRequestNumber(String requestNumber);
    long countByRequestNumberStartingWith(String prefix);

    Page<MaintenanceRequest> findByPropertyId(Long propertyId, Pageable pageable);
    Page<MaintenanceRequest> findByTenantId(Long tenantId, Pageable pageable);
    Page<MaintenanceRequest> findByAssignedTo(Long officerId, Pageable pageable);
    Page<MaintenanceRequest> findByStatus(RequestStatus status, Pageable pageable);
    Page<MaintenanceRequest> findByPropertyIdAndStatus(Long propertyId, RequestStatus status, Pageable pageable);

    long countByStatus(RequestStatus status);
    long countByPropertyIdAndStatus(Long propertyId, RequestStatus status);

    @Query("SELECT COUNT(r) FROM MaintenanceRequest r WHERE r.status = 'COMPLETED' AND r.updatedAt >= :from")
    long countCompletedSince(@Param("from") LocalDateTime from);

    @Query("SELECT r.status, COUNT(r) FROM MaintenanceRequest r GROUP BY r.status")
    List<Object[]> countByStatusGrouped();

    @Query("SELECT r.categoryId, COUNT(r) FROM MaintenanceRequest r WHERE r.propertyId = :pid GROUP BY r.categoryId")
    List<Object[]> countByCategoryForProperty(@Param("pid") Long propertyId);
}
