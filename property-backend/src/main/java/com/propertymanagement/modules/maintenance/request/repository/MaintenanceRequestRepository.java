package com.propertymanagement.modules.maintenance.request.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.propertymanagement.modules.maintenance.request.entity.MaintenanceRequest;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {

    Optional<MaintenanceRequest> findByRequestNumber(String requestNumber);
    long countByRequestNumberStartingWith(String prefix);

    Page<MaintenanceRequest> findByPropertyId(Long propertyId, Pageable pageable);

    Page<MaintenanceRequest> findByPropertyIdIn(Collection<Long> propertyIds, Pageable pageable);

    Page<MaintenanceRequest> findByStatusAndPropertyIdIn(RequestStatus status, Collection<Long> propertyIds, Pageable pageable);
    Page<MaintenanceRequest> findByTenantId(Long tenantId, Pageable pageable);
    Page<MaintenanceRequest> findByAssignedTo(Long officerId, Pageable pageable);
    Page<MaintenanceRequest> findByAssignedToAndPropertyId(Long officerId, Long propertyId, Pageable pageable);
    long countByAssignedTo(Long officerId);
    List<MaintenanceRequest> findByCreatedByOrderByCreatedAtDesc(Long createdBy);

    Page<MaintenanceRequest> findByContractorCompanyIdAndPropertyIdAndAssignedToIsNullAndStatusOrderByCreatedAtDesc(
            Long contractorCompanyId,
            Long propertyId,
            RequestStatus status,
            Pageable pageable);

    Page<MaintenanceRequest> findByContractorCompanyIdAndAssignedToIsNullAndStatusAndPropertyIdInOrderByCreatedAtDesc(
            Long contractorCompanyId,
            RequestStatus status,
            Collection<Long> propertyIds,
            Pageable pageable);
    Page<MaintenanceRequest> findByStatus(RequestStatus status, Pageable pageable);
    Page<MaintenanceRequest> findByPropertyIdAndStatus(Long propertyId, RequestStatus status, Pageable pageable);

    long countByStatus(RequestStatus status);
    long countByPropertyIdAndStatus(Long propertyId, RequestStatus status);

    @Query("SELECT COUNT(r) FROM MaintenanceRequest r WHERE r.status = 'COMPLETED' AND r.updatedAt >= :from")
    long countCompletedSince(@Param("from") LocalDateTime from);

    @Query("SELECT COUNT(r) FROM MaintenanceRequest r WHERE r.status NOT IN ('COMPLETED', 'CANCELLED')")
    long countOpenExcludingTerminal();

    @Query("""
            SELECT COUNT(r) FROM MaintenanceRequest r
            WHERE r.assignedTo = :officerId AND r.status NOT IN ('COMPLETED', 'CANCELLED')
            """)
    long countOpenAssignedToOfficer(@Param("officerId") Long officerId);

    @Query("SELECT r.status, COUNT(r) FROM MaintenanceRequest r GROUP BY r.status")
    List<Object[]> countByStatusGrouped();

    @Query("SELECT r.status, COUNT(r) FROM MaintenanceRequest r WHERE r.propertyId = :pid GROUP BY r.status")
    List<Object[]> countByStatusGroupedForProperty(@Param("pid") Long propertyId);

    @Query("SELECT r.categoryId, COUNT(r) FROM MaintenanceRequest r WHERE r.propertyId = :pid GROUP BY r.categoryId")
    List<Object[]> countByCategoryForProperty(@Param("pid") Long propertyId);

    @Query("SELECT r.categoryId, COUNT(r) FROM MaintenanceRequest r GROUP BY r.categoryId")
    List<Object[]> countByCategoryGrouped();

    @Query("""
            SELECT r FROM MaintenanceRequest r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:priority IS NULL OR r.priority = :priority)
              AND (:propertyId IS NULL OR r.propertyId = :propertyId)
            ORDER BY r.createdAt DESC
            """)
    Page<MaintenanceRequest> findFiltered(
            @Param("status") RequestStatus status,
            @Param("priority") RequestPriority priority,
            @Param("propertyId") Long propertyId,
            Pageable pageable);

    @Query("""
            SELECT r FROM MaintenanceRequest r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:priority IS NULL OR r.priority = :priority)
              AND r.propertyId IN :propertyIds
            ORDER BY r.createdAt DESC
            """)
    Page<MaintenanceRequest> findFilteredForPropertyIds(
            @Param("status") RequestStatus status,
            @Param("priority") RequestPriority priority,
            @Param("propertyIds") Collection<Long> propertyIds,
            Pageable pageable);

    @Query("SELECT YEAR(r.createdAt), MONTH(r.createdAt), COUNT(r) FROM MaintenanceRequest r WHERE r.createdAt >= :since GROUP BY YEAR(r.createdAt), MONTH(r.createdAt) ORDER BY YEAR(r.createdAt), MONTH(r.createdAt)")
    List<Object[]> countByMonth(@Param("since") LocalDateTime since);

    @Query("""
            SELECT YEAR(r.createdAt), MONTH(r.createdAt), COUNT(r)
            FROM MaintenanceRequest r
            WHERE r.createdAt >= :since
              AND r.propertyId = :pid
            GROUP BY YEAR(r.createdAt), MONTH(r.createdAt)
            ORDER BY YEAR(r.createdAt), MONTH(r.createdAt)
            """)
    List<Object[]> countByMonthForProperty(@Param("since") LocalDateTime since, @Param("pid") Long propertyId);

    @Query("SELECT COUNT(r) FROM MaintenanceRequest r WHERE r.status = 'COMPLETED' AND r.updatedAt >= :from AND r.propertyId = :pid")
    long countCompletedSinceForProperty(@Param("from") LocalDateTime from, @Param("pid") Long propertyId);

    @Query("SELECT COUNT(r) FROM MaintenanceRequest r WHERE r.propertyId = :pid AND r.status NOT IN ('COMPLETED', 'CANCELLED')")
    long countOpenExcludingTerminalForProperty(@Param("pid") Long propertyId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE MaintenanceRequest r SET r.tenantId = null WHERE r.tenantId = :tenantId")
    void clearTenantIdForTenant(@Param("tenantId") Long tenantId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE MaintenanceRequest r SET r.assignedTo = :replacementOfficerId WHERE r.assignedTo = :officerId")
    int reassignOfficer(
            @Param("officerId") Long officerId,
            @Param("replacementOfficerId") Long replacementOfficerId);

    @Query("SELECT COUNT(r) FROM MaintenanceRequest r WHERE r.unitId = :unitId AND r.status IN :statuses")
    long countByUnitIdAndStatuses(@Param("unitId") Long unitId, @Param("statuses") Collection<RequestStatus> statuses);

    @Query("SELECT r FROM MaintenanceRequest r WHERE r.unitId = :unitId AND r.status IN :statuses")
    List<MaintenanceRequest> findByUnitIdAndStatuses(
            @Param("unitId") Long unitId,
            @Param("statuses") Collection<RequestStatus> statuses,
            Pageable pageable);
}
