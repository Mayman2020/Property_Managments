package com.propertymanagement.modules.hr.payroll;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PayrollRepository extends JpaRepository<PayrollRun, Long> {
    Page<PayrollRun> findAllByOrderByPayPeriodYearDescPayPeriodMonthDesc(Pageable pageable);
    Optional<PayrollRun> findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(Long propertyId, Integer payPeriodYear, Integer payPeriodMonth);
}
