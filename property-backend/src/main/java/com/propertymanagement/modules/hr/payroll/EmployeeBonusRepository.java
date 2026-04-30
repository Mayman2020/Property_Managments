package com.propertymanagement.modules.hr.payroll;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeBonusRepository extends JpaRepository<EmployeeBonus, Long> {
    List<EmployeeBonus> findByPayrollRunId(Long payrollRunId);
    List<EmployeeBonus> findByPayrollRunIdAndEmployeeId(Long payrollRunId, Long employeeId);
}
