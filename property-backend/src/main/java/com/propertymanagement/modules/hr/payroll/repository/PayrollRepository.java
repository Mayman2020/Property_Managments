package com.propertymanagement.modules.hr.payroll.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;
import com.propertymanagement.modules.hr.payroll.entity.PayrollRun;

public interface PayrollRepository extends JpaRepository<PayrollRun, Long> {
    Page<PayrollRun> findAllByOrderByPayPeriodYearDescPayPeriodMonthDesc(Pageable pageable);
    Page<PayrollRun> findAllByPropertyIdOrderByPayPeriodYearDescPayPeriodMonthDesc(Long propertyId, Pageable pageable);
    Page<PayrollRun> findAllByPropertyIdInOrderByPayPeriodYearDescPayPeriodMonthDesc(Collection<Long> propertyIds, Pageable pageable);
    Optional<PayrollRun> findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(Long propertyId, Integer payPeriodYear, Integer payPeriodMonth);
    Optional<PayrollRun> findByIdAndPropertyId(Long id, Long propertyId);
    Optional<PayrollRun> findByIdAndPropertyIdIn(Long id, Collection<Long> propertyIds);
}
