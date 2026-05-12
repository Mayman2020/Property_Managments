package com.propertymanagement.modules.hr.payroll.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.propertymanagement.modules.hr.payroll.entity.EmployeeBonus;

public interface EmployeeBonusRepository extends JpaRepository<EmployeeBonus, Long> {
    List<EmployeeBonus> findByPayrollRunId(Long payrollRunId);
    List<EmployeeBonus> findByPayrollRunIdAndEmployeeId(Long payrollRunId, Long employeeId);
}
