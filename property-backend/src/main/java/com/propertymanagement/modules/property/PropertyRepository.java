package com.propertymanagement.modules.property;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
    boolean existsByPropertyCode(String code);
    Optional<Property> findByPropertyCode(String code);

    @Query("SELECT COUNT(p) FROM Property p WHERE p.active = true")
    long countActive();
}
