package com.propertymanagement.modules.unit.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.entity.UnitType;
import com.propertymanagement.modules.property.entity.Floor;

import java.util.Collection;
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

    @Query("""
            SELECT u FROM Unit u
            LEFT JOIN Floor f ON f.id = u.floorId
            WHERE (:propertyId IS NULL OR u.propertyId = :propertyId)
              AND (:active IS NULL OR u.active = :active)
              AND (:unitType IS NULL OR u.unitType = :unitType)
              AND (:floorNumber IS NULL OR f.floorNumber = :floorNumber)
              AND (
                :occupancy IS NULL OR :occupancy = '' OR
                (:occupancy = 'rented' AND u.rented = true) OR
                (:occupancy = 'reserved' AND u.reserved = true AND u.rented = false) OR
                (:occupancy = 'vacant' AND u.rented = false AND u.reserved = false)
              )
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(u.unitNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(CONCAT('', u.unitType)) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.notes, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Unit> search(
            @Param("propertyId") Long propertyId,
            @Param("q") String q,
            @Param("floorNumber") Integer floorNumber,
            @Param("unitType") UnitType unitType,
            @Param("occupancy") String occupancy,
            @Param("active") Boolean active,
            Pageable pageable);

    @Query("""
            SELECT u FROM Unit u
            LEFT JOIN Floor f ON f.id = u.floorId
            WHERE u.propertyId IN :propertyIds
              AND (:propertyId IS NULL OR u.propertyId = :propertyId)
              AND (:active IS NULL OR u.active = :active)
              AND (:unitType IS NULL OR u.unitType = :unitType)
              AND (:floorNumber IS NULL OR f.floorNumber = :floorNumber)
              AND (
                :occupancy IS NULL OR :occupancy = '' OR
                (:occupancy = 'rented' AND u.rented = true) OR
                (:occupancy = 'reserved' AND u.reserved = true AND u.rented = false) OR
                (:occupancy = 'vacant' AND u.rented = false AND u.reserved = false)
              )
              AND (
                :q IS NULL OR :q = '' OR
                LOWER(COALESCE(u.unitNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(CONCAT('', u.unitType)) LIKE LOWER(CONCAT('%', :q, '%')) OR
                LOWER(COALESCE(u.notes, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Unit> searchInPropertyIds(
            @Param("propertyIds") Collection<Long> propertyIds,
            @Param("propertyId") Long propertyId,
            @Param("q") String q,
            @Param("floorNumber") Integer floorNumber,
            @Param("unitType") UnitType unitType,
            @Param("occupancy") String occupancy,
            @Param("active") Boolean active,
            Pageable pageable);

    List<Unit> findByPropertyIdAndActiveTrue(Long propertyId);
    boolean existsByPropertyIdAndUnitNumber(Long propertyId, String unitNumber);

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.active = true")
    long countAllActive();

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.rented = true AND u.active = true")
    long countRented();

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.rented = false AND u.reserved = false AND u.active = true")
    long countVacant();

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.reserved = true AND u.active = true")
    long countReserved();

    long countByPropertyIdAndActiveTrue(Long propertyId);

    long countByPropertyIdAndActiveTrueAndRentedTrue(Long propertyId);

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.propertyId = :propertyId AND u.rented = false AND u.reserved = false AND u.active = true")
    long countVacantByPropertyId(@Param("propertyId") Long propertyId);

    @Query("SELECT COUNT(u) FROM Unit u WHERE u.propertyId = :propertyId AND u.reserved = true AND u.active = true")
    long countReservedByPropertyId(@Param("propertyId") Long propertyId);

    long countByPropertyIdAndFloorIdAndActiveTrue(Long propertyId, Long floorId);
}
