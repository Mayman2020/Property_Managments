package com.propertymanagement.modules.hr.payroll.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.propertymanagement.modules.hr.payroll.entity.Payslip;

public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    List<Payslip> findByPayrollRunIdOrderByIdAsc(Long payrollRunId);
    Optional<Payslip> findByIdAndPayrollRunId(Long id, Long payrollRunId);
    List<Payslip> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    Optional<Payslip> findByIdAndEmployeeId(Long id, Long employeeId);
}
