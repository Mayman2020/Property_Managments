package com.propertymanagement.modules.finance.revenue.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.propertymanagement.modules.finance.revenue.entity.OtherRevenue;

public interface OtherRevenueWriterRepository extends JpaRepository<OtherRevenue, Long> {
    long countByRevenueNumberStartingWith(String prefix);
    boolean existsByDescriptionContaining(String marker);

    @org.springframework.data.jpa.repository.Query("""
            SELECT COALESCE(SUM(r.amount), 0) FROM OtherRevenue r
            WHERE r.propertyId = :propertyId
              AND r.revenueDate >= :from AND r.revenueDate <= :to
            """)
    java.math.BigDecimal sumAmountByPropertyBetween(
            @org.springframework.data.repository.query.Param("propertyId") Long propertyId,
            @org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to);
}
