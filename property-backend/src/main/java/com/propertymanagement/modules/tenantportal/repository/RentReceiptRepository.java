package com.propertymanagement.modules.tenantportal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.propertymanagement.modules.tenantportal.entity.RentReceipt;

import java.util.List;
import java.util.Optional;

public interface RentReceiptRepository extends JpaRepository<RentReceipt, Long> {
    boolean existsByTenantId(Long tenantId);

    List<RentReceipt> findByTenantIdOrderByPeriodYearDescPeriodMonthDesc(Long tenantId);
    Optional<RentReceipt> findByTenantIdAndPeriodYearAndPeriodMonth(Long tenantId, Integer year, Integer month);
    List<RentReceipt> findByContractIdOrderByPeriodYearDescPeriodMonthDesc(Long contractId);

    @Query("SELECT r FROM RentReceipt r WHERE r.periodYear = :year AND r.periodMonth = :month ORDER BY r.createdAt DESC")
    List<RentReceipt> findByPeriodYearAndMonth(@Param("year") Integer year, @Param("month") Integer month);

    @Query("SELECT r FROM RentReceipt r WHERE r.periodYear = :year AND r.periodMonth = :month AND r.status = :status ORDER BY r.createdAt DESC")
    List<RentReceipt> findByPeriodAndStatus(@Param("year") Integer year, @Param("month") Integer month, @Param("status") String status);

    List<RentReceipt> findByStatusOrderByPeriodYearDescPeriodMonthDesc(String status);
}
