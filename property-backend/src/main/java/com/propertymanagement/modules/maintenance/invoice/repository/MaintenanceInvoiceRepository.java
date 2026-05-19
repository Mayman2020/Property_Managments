package com.propertymanagement.modules.maintenance.invoice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import com.propertymanagement.modules.maintenance.invoice.entity.MaintenanceInvoice;

public interface MaintenanceInvoiceRepository extends JpaRepository<MaintenanceInvoice, Long> {

    List<MaintenanceInvoice> findByContractorCompanyIdOrderByPeriodYearDescPeriodMonthDesc(Long companyId);

    List<MaintenanceInvoice> findByContractorCompanyIdAndPropertyIdOrderByPeriodYearDescPeriodMonthDesc(Long companyId, Long propertyId);

    @Query("SELECT i FROM MaintenanceInvoice i WHERE i.contractorCompanyId = :companyId " +
           "AND i.periodYear = :year AND i.periodMonth = :month ORDER BY i.createdAt DESC")
    List<MaintenanceInvoice> findByCompanyAndPeriod(@Param("companyId") Long companyId,
                                                    @Param("year") Integer year,
                                                    @Param("month") Integer month);

    @Query("SELECT i FROM MaintenanceInvoice i WHERE i.contractorCompanyId = :companyId " +
           "AND i.propertyId = :propertyId AND i.periodYear = :year AND i.periodMonth = :month ORDER BY i.createdAt DESC")
    List<MaintenanceInvoice> findByCompanyAndPropertyAndPeriod(@Param("companyId") Long companyId,
                                                               @Param("propertyId") Long propertyId,
                                                               @Param("year") Integer year,
                                                               @Param("month") Integer month);

    @Query("SELECT i FROM MaintenanceInvoice i WHERE i.periodYear = :year AND i.periodMonth = :month ORDER BY i.createdAt DESC")
    List<MaintenanceInvoice> findByPeriod(@Param("year") Integer year, @Param("month") Integer month);

    List<MaintenanceInvoice> findByStatusOrderByCreatedAtDesc(String status);

    long countByInvoiceNumberStartingWith(String prefix);
}
