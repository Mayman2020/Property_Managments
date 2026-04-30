package com.propertymanagement.modules.hr.leave.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class LeaveRequestResponse {
    private Long id;
    private String employeeName;
    private String leaveTypeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer daysCount;
    private String status;
}
