package com.propertymanagement.modules.vacancy.repository;

import com.propertymanagement.modules.vacancy.entity.VacancyListingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface VacancyRepository extends JpaRepository<VacancyListingEntity, Long> {

    boolean existsByUnitIdAndPublishedTrue(Long unitId);

    Optional<VacancyListingEntity> findByUnitId(Long unitId);

    @Query(value = """
            SELECT vl.id AS id,
                   vl.title_ar AS titleAr,
                   vl.title_en AS titleEn,
                   p.property_name AS propertyName,
                   u.unit_number AS unitNumber,
                   vl.asking_rent AS askingRent,
                   vl.available_from AS availableFrom,
                   vl.is_published AS isPublished,
                   vl.listing_source AS listingSource,
                   COALESCE(vl.views_count, 0) AS viewsCount,
                   vl.property_id AS propertyId,
                   vl.unit_id AS unitId,
                   o.full_name_ar AS ownerNameAr,
                   o.full_name_en AS ownerNameEn
            FROM vacancy_listings vl
            LEFT JOIN properties p ON p.id = vl.property_id
            LEFT JOIN units u ON u.id = vl.unit_id
            LEFT JOIN owners o ON o.id = p.owner_id
            WHERE (:q IS NULL OR
                   LOWER(COALESCE(vl.title_ar, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(vl.title_en, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(p.property_name, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(u.unit_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:propertyId IS NULL OR vl.property_id = :propertyId)
              AND (:ownerId IS NULL OR EXISTS (
                    SELECT 1 FROM property_owners po
                    WHERE po.property_id = vl.property_id AND po.owner_id = :ownerId
                  ) OR p.owner_id = :ownerId)
              AND vl.is_published = TRUE
              AND (u.id IS NULL OR (
                    COALESCE(u.is_rented, FALSE) = FALSE
                AND COALESCE(u.is_reserved, FALSE) = FALSE
                AND COALESCE(u.is_active, TRUE) = TRUE
              ))
            ORDER BY vl.created_at DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM vacancy_listings vl
            LEFT JOIN properties p ON p.id = vl.property_id
            LEFT JOIN units u ON u.id = vl.unit_id
            WHERE (:q IS NULL OR
                   LOWER(COALESCE(vl.title_ar, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(vl.title_en, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(p.property_name, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(u.unit_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:propertyId IS NULL OR vl.property_id = :propertyId)
              AND (:ownerId IS NULL OR EXISTS (
                    SELECT 1 FROM property_owners po
                    WHERE po.property_id = vl.property_id AND po.owner_id = :ownerId
                  ) OR p.owner_id = :ownerId)
              AND vl.is_published = TRUE
              AND (u.id IS NULL OR (
                    COALESCE(u.is_rented, FALSE) = FALSE
                AND COALESCE(u.is_reserved, FALSE) = FALSE
                AND COALESCE(u.is_active, TRUE) = TRUE
              ))
            """,
            nativeQuery = true)
    Page<VacancyListingRow> search(
            @Param("q") String q,
            @Param("propertyId") Long propertyId,
            @Param("ownerId") Long ownerId,
            Pageable pageable);

    interface VacancyListingRow {
        Long getId();
        String getTitleAr();
        String getTitleEn();
        String getPropertyName();
        String getUnitNumber();
        BigDecimal getAskingRent();
        LocalDate getAvailableFrom();
        Boolean getIsPublished();
        String getListingSource();
        Integer getViewsCount();
        Long getPropertyId();
        Long getUnitId();
        String getOwnerNameAr();
        String getOwnerNameEn();
    }

    @Query(value = """
            SELECT lc.id FROM lease_contracts lc
            WHERE lc.status IN ('TERMINATED', 'EXPIRED')
              AND lc.unit_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM vacancy_listings vl
                  WHERE vl.unit_id = lc.unit_id AND vl.is_published = TRUE
              )
            """, nativeQuery = true)
    List<Long> findContractIdsNeedingVacancyPublish();

    @Query("SELECT v.unitId FROM VacancyListingEntity v WHERE v.unitId IN :unitIds AND v.published = true")
    Set<Long> findPublishedUnitIds(@Param("unitIds") Collection<Long> unitIds);
}
