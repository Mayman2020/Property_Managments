package com.propertymanagement.modules.contract.lease.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import com.propertymanagement.modules.contract.lease.entity.LeaseContract;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.property.entity.Property;

public interface LeaseContractRepository extends JpaRepository<LeaseContract, Long> {

    Page<LeaseContract> findAll(Pageable pageable);

    Page<LeaseContract> findByStatus(ContractStatus status, Pageable pageable);

    Page<LeaseContract> findByPropertyId(Long propertyId, Pageable pageable);

    Page<LeaseContract> findByPropertyIdIn(Collection<Long> propertyIds, Pageable pageable);

    Page<LeaseContract> findByStatusAndPropertyIdIn(ContractStatus status, Collection<Long> propertyIds, Pageable pageable);

    @Query("""
            SELECT c FROM LeaseContract c
            WHERE (:status IS NULL OR c.status = :status)
              AND (:ownerApprovalStatus IS NULL OR :ownerApprovalStatus = '' OR c.ownerApprovalStatus = :ownerApprovalStatus)
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(c.contractNumber, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<LeaseContract> search(
            @Param("status") ContractStatus status,
            @Param("ownerApprovalStatus") String ownerApprovalStatus,
            @Param("q") String q,
            Pageable pageable);

    @Query("""
            SELECT c FROM LeaseContract c
            WHERE c.propertyId IN :propertyIds
              AND (:status IS NULL OR c.status = :status)
              AND (:ownerApprovalStatus IS NULL OR :ownerApprovalStatus = '' OR c.ownerApprovalStatus = :ownerApprovalStatus)
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(c.contractNumber, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<LeaseContract> searchInPropertyIds(
            @Param("propertyIds") Collection<Long> propertyIds,
            @Param("status") ContractStatus status,
            @Param("ownerApprovalStatus") String ownerApprovalStatus,
            @Param("q") String q,
            Pageable pageable);

    List<LeaseContract> findByTenantId(Long tenantId);

    List<LeaseContract> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    boolean existsByTenantId(Long tenantId);

    boolean existsByTenantIdAndStatus(Long tenantId, ContractStatus status);

    long countByContractNumberStartingWith(String prefix);

    @Query("SELECT lc FROM LeaseContract lc WHERE lc.status = 'ACTIVE' AND lc.endDate <= :cutoff")
    List<LeaseContract> findExpiringBefore(@Param("cutoff") LocalDate cutoff);

    @Query("SELECT lc FROM LeaseContract lc WHERE lc.status = 'ACTIVE' AND lc.endDate BETWEEN :from AND :to")
    List<LeaseContract> findExpiringBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT COUNT(lc) FROM LeaseContract lc WHERE lc.status = 'ACTIVE'")
    long countActive();

    long countByStatus(ContractStatus status);

    long countByStatusAndPropertyId(ContractStatus status, Long propertyId);

    @Query("SELECT COUNT(lc) FROM LeaseContract lc WHERE lc.status = 'ACTIVE' AND lc.propertyId = :propertyId")
    long countActiveByProperty(@Param("propertyId") Long propertyId);

    @Query("SELECT COUNT(lc) FROM LeaseContract lc WHERE lc.status = 'ACTIVE' AND lc.endDate <= :cutoff")
    long countExpiringBefore(@Param("cutoff") LocalDate cutoff);

    @Query("SELECT COUNT(lc) FROM LeaseContract lc WHERE lc.status = 'ACTIVE' AND lc.propertyId = :propertyId AND lc.endDate <= :cutoff")
    long countExpiringBeforeByProperty(@Param("propertyId") Long propertyId, @Param("cutoff") LocalDate cutoff);

    List<LeaseContract> findByStatusAndEndDateBefore(ContractStatus status, LocalDate date);

    List<LeaseContract> findByStatusAndEndDate(ContractStatus status, LocalDate endDate);

    Optional<LeaseContract> findFirstByTenantIdAndStatusOrderByStartDateDesc(Long tenantId, ContractStatus status);

    List<LeaseContract> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, ContractStatus status);

    List<LeaseContract> findByStatusOrderByCreatedAtDesc(ContractStatus status);

    /** Used by the owner portal so all property co-owners (not only contract.owner_id) see drafts. */
    List<LeaseContract> findByStatusAndPropertyIdInOrderByCreatedAtDesc(
            ContractStatus status, Collection<Long> propertyIds);

    @Query("""
            SELECT c FROM LeaseContract c
            WHERE c.terminationRequestedBy = :userId OR c.renewalRequestedBy = :userId
            ORDER BY COALESCE(c.terminationRequestedAt, c.renewalRequestedAt, c.createdAt) DESC
            """)
    List<LeaseContract> findLeaseRequestsByRequester(@Param("userId") Long userId);

    @Query("SELECT COUNT(c) FROM LeaseContract c WHERE c.unitId = :unitId AND c.status IN :statuses")
    long countByUnitIdAndStatusIn(@Param("unitId") Long unitId, @Param("statuses") Collection<ContractStatus> statuses);

    /** Row-level lock used for owner decisions / cancel-request race protection. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM LeaseContract c WHERE c.id = :id")
    Optional<LeaseContract> findByIdForUpdate(@Param("id") Long id);
}
