package com.propertymanagement.modules.hr.payroll.repository;

import com.propertymanagement.modules.hr.payroll.entity.PayrollDeduction;
import com.propertymanagement.modules.hr.payroll.entity.PayrollDeductionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PayrollDeductionRepository extends JpaRepository<PayrollDeduction, Long> {
    boolean existsByEmployeeIdAndReasonIgnoreCaseAndPayrollMonth(Long employeeId, String reason, String payrollMonth);

    boolean existsByEmployeeIdAndReasonIgnoreCaseAndPayrollMonthAndIdNot(Long employeeId, String reason, String payrollMonth, Long id);

    List<PayrollDeduction> findByEmployeeIdAndPayrollMonthAndStatus(Long employeeId, String payrollMonth, PayrollDeductionStatus status);

    Page<PayrollDeduction> findByEmployeeIdInOrderByCreatedAtDesc(Collection<Long> employeeIds, Pageable pageable);
}
