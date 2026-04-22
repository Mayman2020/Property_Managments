package com.propertymanagement.modules.tenant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByEmail(String email);
    Optional<Tenant> findByUnitIdAndActiveTrue(Long unitId);
    Optional<Tenant> findByUserId(Long userId);
    Page<Tenant> findByActiveTrue(Pageable pageable);
    @Query("""
            SELECT t FROM Tenant t
            WHERE t.active = true
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(t.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(t.email, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(t.phone, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(t.nationalId, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Tenant> searchActive(@Param("q") String q, Pageable pageable);
    boolean existsByEmail(String email);
}
