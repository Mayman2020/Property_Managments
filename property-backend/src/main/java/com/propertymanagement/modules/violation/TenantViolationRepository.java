package com.propertymanagement.modules.violation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TenantViolationRepository extends JpaRepository<TenantViolation, Long> {
    boolean existsByTenantId(Long tenantId);

    List<TenantViolation> findByTenantId(Long tenantId);
    List<TenantViolation> findByContractId(Long contractId);
    Page<TenantViolation> findAll(Pageable pageable);
    Page<TenantViolation> findByStatus(String status, Pageable pageable);

    @Query("SELECT COUNT(v) FROM TenantViolation v WHERE v.status = 'OPEN' OR v.status = 'NOTIFIED'")
    long countOpen();

    @Query("""
            SELECT COUNT(v) FROM TenantViolation v
            WHERE (v.status = 'OPEN' OR v.status = 'NOTIFIED')
              AND v.propertyId = :propertyId
            """)
    long countOpenByProperty(@Param("propertyId") Long propertyId);
}
