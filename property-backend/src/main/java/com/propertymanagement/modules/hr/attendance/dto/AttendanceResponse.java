package com.propertymanagement.modules.hr.attendance.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class AttendanceResponse {
    private Long id;
    private String employeeName;
    private LocalDate attendanceDate;
    private String checkIn;
    private String checkOut;
    private Integer lateMinutes;
    private String status;
}
