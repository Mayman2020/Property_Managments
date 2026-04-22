package com.propertymanagement.modules.tenant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByEmail(String email);
    Optional<Tenant> findByUnitIdAndActiveTrue(Long unitId);
    Optional<Tenant> findByUserId(Long userId);
    Page<Tenant> findByActiveTrue(Pageable pageable);
    boolean existsByEmail(String email);
}
