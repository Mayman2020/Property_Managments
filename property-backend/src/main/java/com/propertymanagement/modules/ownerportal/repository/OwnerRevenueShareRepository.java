package com.propertymanagement.modules.ownerportal.repository;

import com.propertymanagement.modules.ownerportal.entity.OwnerRevenueShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface OwnerRevenueShareRepository extends JpaRepository<OwnerRevenueShare, Long> {

    boolean existsByRentPaymentId(Long rentPaymentId);

    List<OwnerRevenueShare> findByOwnerIdAndYearAndMonthOrderByCreatedAtDesc(
            Long ownerId, Integer year, Integer month);

    @Query("""
            SELECT COALESCE(SUM(s.amount), 0) FROM OwnerRevenueShare s
            WHERE s.ownerId = :ownerId AND s.propertyId = :propertyId
              AND s.year = :year AND s.month = :month
            """)
    BigDecimal sumAmountByOwnerPropertyMonth(
            @Param("ownerId") Long ownerId,
            @Param("propertyId") Long propertyId,
            @Param("year") Integer year,
            @Param("month") Integer month);

    @Query("""
            SELECT COALESCE(SUM(s.amount), 0) FROM OwnerRevenueShare s
            WHERE s.propertyId = :propertyId AND s.year = :year AND s.month = :month
            """)
    BigDecimal sumAmountByPropertyMonth(
            @Param("propertyId") Long propertyId,
            @Param("year") Integer year,
            @Param("month") Integer month);

    List<OwnerRevenueShare> findByPropertyIdAndYearAndMonth(Long propertyId, Integer year, Integer month);
}
