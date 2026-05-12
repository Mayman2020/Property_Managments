package com.propertymanagement.modules.complaint.repository;

import com.propertymanagement.modules.complaint.entity.TenantComplaint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TenantComplaintRepository extends JpaRepository<TenantComplaint, Long> {
    boolean existsByTenantId(Long tenantId);

    Page<TenantComplaint> findAll(Pageable pageable);
    Page<TenantComplaint> findByPropertyId(Long propertyId, Pageable pageable);
    Page<TenantComplaint> findByPropertyIdIn(Collection<Long> propertyIds, Pageable pageable);

    List<TenantComplaint> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<TenantComplaint> findByTenantIdAndStatusInOrderByCreatedAtDesc(Long tenantId, Collection<String> statuses);

    @Query("SELECT COUNT(c) FROM TenantComplaint c WHERE c.status = 'OPEN' OR c.status = 'IN_REVIEW'")
    long countOpen();

    @Query("""
            SELECT COUNT(c) FROM TenantComplaint c
            WHERE (c.status = 'OPEN' OR c.status = 'IN_REVIEW')
              AND c.propertyId = :propertyId
            """)
    long countOpenByProperty(@Param("propertyId") Long propertyId);
}
