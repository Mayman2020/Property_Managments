package com.propertymanagement.modules.hr.leave.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateLeaveRequest {
    @NotNull
    private Long employeeId;
    @NotNull
    private Long leaveTypeId;
    @NotNull
    private LocalDate startDate;
    @NotNull
    private LocalDate endDate;
    private String reason;
    private String attachmentUrl;
}
