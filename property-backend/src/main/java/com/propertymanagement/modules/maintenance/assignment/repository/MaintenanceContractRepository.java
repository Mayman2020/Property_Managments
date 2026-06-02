package com.propertymanagement.modules.maintenance.assignment.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.propertymanagement.modules.maintenance.assignment.entity.MaintenanceContract;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceContractRepository extends JpaRepository<MaintenanceContract, Long> {

    List<MaintenanceContract> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    List<MaintenanceContract> findByContractorCompanyIdOrderByCreatedAtDesc(Long contractorCompanyId);

    Optional<MaintenanceContract> findFirstByContractorCompanyIdOrderByCreatedAtDesc(Long contractorCompanyId);

    List<MaintenanceContract> findByStatusOrderByCreatedAtDesc(String status);

    List<MaintenanceContract> findByStatusAndPropertyIdInOrderByCreatedAtDesc(String status, Collection<Long> propertyIds);

    List<MaintenanceContract> findByPropertyIdInOrderByCreatedAtDesc(Collection<Long> propertyIds);

    @Query("""
            SELECT mc FROM MaintenanceContract mc
            WHERE (:status IS NULL OR :status = '' OR mc.status = :status)
              AND (:ownerApprovalStatus IS NULL OR :ownerApprovalStatus = '' OR mc.ownerApprovalStatus = :ownerApprovalStatus)
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(mc.contractNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(mc.notes, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<MaintenanceContract> search(
            @Param("status") String status,
            @Param("ownerApprovalStatus") String ownerApprovalStatus,
            @Param("q") String q,
            Pageable pageable);

    @Query("""
            SELECT mc FROM MaintenanceContract mc
            WHERE mc.propertyId IN :propertyIds
              AND (:status IS NULL OR :status = '' OR mc.status = :status)
              AND (:ownerApprovalStatus IS NULL OR :ownerApprovalStatus = '' OR mc.ownerApprovalStatus = :ownerApprovalStatus)
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(mc.contractNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(mc.notes, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<MaintenanceContract> searchInPropertyIds(
            @Param("propertyIds") Collection<Long> propertyIds,
            @Param("status") String status,
            @Param("ownerApprovalStatus") String ownerApprovalStatus,
            @Param("q") String q,
            Pageable pageable);

    @Query("""
            SELECT c FROM MaintenanceContract c
            WHERE c.terminationRequestedBy = :userId OR c.renewalRequestedBy = :userId
            ORDER BY COALESCE(c.terminationRequestedAt, c.renewalRequestedAt, c.createdAt) DESC
            """)
    List<MaintenanceContract> findRequestsByRequester(@Param("userId") Long userId);

    Optional<MaintenanceContract> findByAssignmentId(Long assignmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM MaintenanceContract c WHERE c.id = :id")
    Optional<MaintenanceContract> findByIdForUpdate(@Param("id") Long id);

    boolean existsByContractNumber(String contractNumber);

    long countByContractNumberStartingWith(String prefix);

    /**
     * Company has any ongoing ACTIVE maintenance contract (used e.g. before deleting the company).
     */
    @Query("""
            SELECT COUNT(mc) > 0 FROM MaintenanceContract mc
            WHERE mc.contractorCompanyId = :companyId
              AND mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
            """)
    boolean existsActiveOngoingForContractor(
            @Param("companyId") Long companyId,
            @Param("today") LocalDate today);

    /**
     * Same company + property has an ACTIVE contract whose date window includes {@code today}.
     */
    @Query("""
            SELECT COUNT(mc) > 0 FROM MaintenanceContract mc
            WHERE mc.contractorCompanyId = :companyId
              AND mc.propertyId = :propertyId
              AND mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
            """)
    boolean existsActiveOngoingForContractorOnProperty(
            @Param("companyId") Long companyId,
            @Param("propertyId") Long propertyId,
            @Param("today") LocalDate today);

    @Query("""
            SELECT mc FROM MaintenanceContract mc
            WHERE mc.contractorCompanyId = :companyId
              AND mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
            ORDER BY mc.createdAt DESC
            """)
    List<MaintenanceContract> findActiveOngoingByContractor(
            @Param("companyId") Long companyId,
            @Param("today") LocalDate today);

    @Query("""
            SELECT COUNT(mc) FROM MaintenanceContract mc
            WHERE mc.propertyId = :propertyId
              AND mc.id <> :contractId
              AND mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
            """)
    long countOtherActiveOngoingForProperty(
            @Param("propertyId") Long propertyId,
            @Param("contractId") Long contractId,
            @Param("today") LocalDate today);

    @Query("""
            SELECT DISTINCT mc.propertyId FROM MaintenanceContract mc
            WHERE mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
              AND mc.propertyId IS NOT NULL
            """)
    List<Long> findActiveOngoingPropertyIds(@Param("today") LocalDate today);

    @Query("""
            SELECT DISTINCT mc.contractorCompanyId FROM MaintenanceContract mc
            WHERE mc.propertyId = :propertyId
              AND mc.status = 'ACTIVE'
              AND mc.startDate <= :today
              AND (mc.endDate IS NULL OR mc.endDate >= :today)
            """)
    List<Long> findActiveOngoingCompanyIdsByProperty(
            @Param("propertyId") Long propertyId,
            @Param("today") LocalDate today);
}
