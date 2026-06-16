package com.propertymanagement.modules.hr.payroll.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.hr.payroll.entity.PayrollRun;

public interface PayrollRepository extends JpaRepository<PayrollRun, Long> {

    List<PayrollRun> findByPayDateBetweenOrderByPayDateAsc(LocalDate from, LocalDate to);
    Page<PayrollRun> findAllByOrderByPayPeriodYearDescPayPeriodMonthDesc(Pageable pageable);
    Page<PayrollRun> findAllByPropertyIdOrderByPayPeriodYearDescPayPeriodMonthDesc(Long propertyId, Pageable pageable);
    Page<PayrollRun> findAllByPropertyIdInOrderByPayPeriodYearDescPayPeriodMonthDesc(Collection<Long> propertyIds, Pageable pageable);
    Optional<PayrollRun> findByPropertyIdAndPayPeriodYearAndPayPeriodMonth(Long propertyId, Integer payPeriodYear, Integer payPeriodMonth);
    Optional<PayrollRun> findByIdAndPropertyId(Long id, Long propertyId);
    Optional<PayrollRun> findByIdAndPropertyIdIn(Long id, Collection<Long> propertyIds);

    /**
     * Checks for an existing run and, if found, locks the row exclusively so
     * concurrent callers serialize on that row rather than both seeing empty.
     * When no row exists the insertion race is caught by the DB UNIQUE constraint
     * on (property_id, pay_period_year, pay_period_month).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM PayrollRun r WHERE r.propertyId = :pid AND r.payPeriodYear = :yr AND r.payPeriodMonth = :mo")
    Optional<PayrollRun> findByPeriodForUpdate(@Param("pid") Long propertyId,
                                               @Param("yr") Integer year,
                                               @Param("mo") Integer month);
}
