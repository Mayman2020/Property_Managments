package com.propertymanagement.modules.hr.leave.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EmployeeLeaveBalanceResponse {
    private Long employeeId;
    private Integer year;
    private Integer entitledDays;
    private Integer usedDays;
    private Integer remainingDays;
}
