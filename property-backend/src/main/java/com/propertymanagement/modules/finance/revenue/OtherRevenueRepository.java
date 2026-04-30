package com.propertymanagement.modules.finance.revenue;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface OtherRevenueRepository extends Repository<OtherRevenue, Long> {

    @Query(value = """
            SELECT r.id AS id,
                   r.revenue_number AS revenueNumber,
                   r.description AS description,
                   r.amount AS amount,
                   r.currency AS currency,
                   r.revenue_date AS revenueDate,
                   CASE WHEN :lang = 'ar'
                        THEN COALESCE(rc.category_name_ar, rc.category_name_en)
                        ELSE COALESCE(rc.category_name_en, rc.category_name_ar)
                   END AS categoryName
            FROM other_revenues r
            LEFT JOIN revenue_categories rc ON rc.id = r.category_id
            WHERE (:propertyId IS NULL OR r.property_id = :propertyId)
              AND (:q IS NULL OR
                   LOWER(COALESCE(r.description, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(r.revenue_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY r.revenue_date DESC, r.id DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM other_revenues r
            WHERE (:propertyId IS NULL OR r.property_id = :propertyId)
              AND (:q IS NULL OR
                   LOWER(COALESCE(r.description, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(r.revenue_number, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            nativeQuery = true)
    Page<RevenueRow> search(@Param("q") String q, @Param("propertyId") Long propertyId, @Param("lang") String lang, Pageable pageable);

    interface RevenueRow {
        Long getId();
        String getRevenueNumber();
        String getDescription();
        BigDecimal getAmount();
        String getCurrency();
        LocalDate getRevenueDate();
        String getCategoryName();
    }
}
