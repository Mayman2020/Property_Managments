package com.propertymanagement.modules.hr.payroll.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.propertymanagement.modules.hr.payroll.entity.SalaryAdvance;

public interface SalaryAdvanceRepository extends JpaRepository<SalaryAdvance, Long> {
    List<SalaryAdvance> findByEmployeeIdAndStatusAndDeductedYearAndDeductedMonth(
            Long employeeId,
            String status,
            Integer deductedYear,
            Integer deductedMonth
    );
}
