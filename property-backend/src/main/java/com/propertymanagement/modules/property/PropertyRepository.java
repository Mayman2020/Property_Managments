package com.propertymanagement.modules.property;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    Page<Property> findByActiveTrue(Pageable pageable);
    @Query("""
            SELECT p FROM Property p
            WHERE p.active = true
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(p.propertyName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.propertyNameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.propertyNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.propertyCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.city, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.country, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Property> searchActive(@Param("q") String q, Pageable pageable);

    @Query("""
            SELECT p FROM Property p
            WHERE p.active = true
              AND p.id IN :ids
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(p.propertyName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.propertyNameAr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.propertyNameEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.propertyCode, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.address, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.city, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(p.country, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Property> searchActiveInIds(@Param("ids") Collection<Long> ids, @Param("q") String q, Pageable pageable);
    boolean existsByPropertyCode(String code);
    Optional<Property> findByPropertyCode(String code);
    long countByOwnerIdAndActiveTrue(Long ownerId);
    java.util.List<Property> findByOwnerIdAndActiveTrue(Long ownerId);

    @Query("SELECT COUNT(p) FROM Property p WHERE p.active = true")
    long countActive();

    java.util.List<Property> findByMaintenanceContractorCompanyIdAndActiveTrue(Long companyId);

    @Query(value = "SELECT COUNT(*) FROM property_mgmt.property_owners po WHERE po.property_id = :propertyId AND po.owner_id = :ownerId", nativeQuery = true)
    long countPropertyOwnerLink(@Param("propertyId") Long propertyId, @Param("ownerId") Long ownerId);

    @Query(value = "SELECT po.property_id FROM property_mgmt.property_owners po WHERE po.owner_id = :ownerId", nativeQuery = true)
    java.util.List<Long> findPropertyIdsByCoOwner(@Param("ownerId") Long ownerId);

    /** Properties that store owner contact on the row (may not match {@code owners.id}). */
    @Query("""
            SELECT p FROM Property p
            WHERE p.active = true
              AND p.ownerEmail IS NOT NULL
              AND TRIM(LOWER(p.ownerEmail)) = TRIM(LOWER(:email))
            """)
    java.util.List<Property> findAllActiveByOwnerEmailNormalized(@Param("email") String email);
}
