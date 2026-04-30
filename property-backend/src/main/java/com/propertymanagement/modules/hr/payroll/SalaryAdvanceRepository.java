package com.propertymanagement.modules.hr.payroll;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalaryAdvanceRepository extends JpaRepository<SalaryAdvance, Long> {
    List<SalaryAdvance> findByEmployeeIdAndStatusAndDeductedYearAndDeductedMonth(
            Long employeeId,
            String status,
            Integer deductedYear,
            Integer deductedMonth
    );
}
