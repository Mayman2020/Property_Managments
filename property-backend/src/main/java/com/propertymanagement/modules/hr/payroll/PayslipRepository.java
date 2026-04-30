package com.propertymanagement.modules.hr.payroll;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    List<Payslip> findByPayrollRunIdOrderByIdAsc(Long payrollRunId);
    Optional<Payslip> findByIdAndPayrollRunId(Long id, Long payrollRunId);
}
