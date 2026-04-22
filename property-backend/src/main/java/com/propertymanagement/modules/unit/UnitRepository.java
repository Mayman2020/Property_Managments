package com.propertymanagement.modules.unit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {
    Page<Unit> findByPropertyIdAndActiveTrue(Long propertyId, Pageable pageable);
    @Query("""
            SELECT u FROM Unit u
            WHERE u.propertyId = :propertyId
              AND u.active = true
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(u.unitNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(CONCAT('', u.unitType)) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.notes, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Unit> searchByProperty(@Param("propertyId") Long propertyId, @Param("q") String q, Pageable pageable);
    List<Unit> findByPropertyIdAndActiveTrue(Long propertyId);
    boolean existsByPropertyIdAndUnitNumber(Long propertyId, String unitNumber);

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.active = true")
    long countAllActive();

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.rented = true AND u.active = true")
    long countRented();

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.rented = false AND u.active = true")
    long countVacant();
}
