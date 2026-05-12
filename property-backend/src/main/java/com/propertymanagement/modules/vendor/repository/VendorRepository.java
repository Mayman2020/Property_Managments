package com.propertymanagement.modules.vendor.repository;

import com.propertymanagement.modules.vendor.entity.VendorEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VendorRepository extends JpaRepository<VendorEntity, Long> {

    @Query("""
            SELECT v FROM VendorEntity v
            WHERE (:propertyId IS NULL OR v.propertyId = :propertyId)
              AND (:q IS NULL OR :q = '' OR
                   LOWER(COALESCE(v.vendorName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(v.vendorNameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(v.vendorNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(v.vendorCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(v.contactPerson, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(v.vendorType, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<VendorEntity> search(@Param("q") String q, @Param("propertyId") Long propertyId, Pageable pageable);

    boolean existsByVendorCode(String vendorCode);
}
