package com.propertymanagement.modules.contract.lease;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LeaseContractRepository extends JpaRepository<LeaseContract, Long> {

    Page<LeaseContract> findAll(Pageable pageable);

    Page<LeaseContract> findByStatus(ContractStatus status, Pageable pageable);

    Page<LeaseContract> findByPropertyId(Long propertyId, Pageable pageable);

    List<LeaseContract> findByTenantId(Long tenantId);

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

    Optional<LeaseContract> findFirstByTenantIdAndStatusOrderByStartDateDesc(Long tenantId, ContractStatus status);

    List<LeaseContract> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, ContractStatus status);

    List<LeaseContract> findByStatusOrderByCreatedAtDesc(ContractStatus status);
}
