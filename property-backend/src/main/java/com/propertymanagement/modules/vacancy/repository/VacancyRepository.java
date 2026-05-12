package com.propertymanagement.modules.vacancy.repository;

import com.propertymanagement.modules.vacancy.entity.VacancyListingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface VacancyRepository extends JpaRepository<VacancyListingEntity, Long> {

    @Query(value = """
            SELECT vl.id AS id,
                   vl.title_ar AS titleAr,
                   vl.title_en AS titleEn,
                   p.property_name AS propertyName,
                   u.unit_number AS unitNumber,
                   vl.asking_rent AS askingRent,
                   vl.available_from AS availableFrom,
                   vl.is_published AS isPublished,
                   COALESCE(vl.views_count, 0) AS viewsCount
            FROM vacancy_listings vl
            LEFT JOIN properties p ON p.id = vl.property_id
            LEFT JOIN units u ON u.id = vl.unit_id
            WHERE (:q IS NULL OR
                   LOWER(COALESCE(vl.title_ar, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(vl.title_en, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(p.property_name, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(u.unit_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
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
            """,
            nativeQuery = true)
    Page<VacancyListingRow> search(@Param("q") String q, Pageable pageable);

    interface VacancyListingRow {
        Long getId();
        String getTitleAr();
        String getTitleEn();
        String getPropertyName();
        String getUnitNumber();
        BigDecimal getAskingRent();
        LocalDate getAvailableFrom();
        Boolean getIsPublished();
        Integer getViewsCount();
    }
}
