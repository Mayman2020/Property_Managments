package com.propertymanagement.modules.maintenance.request.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ScheduleRequestDto {
    @NotNull
    private LocalDate scheduledDate;
    private LocalTime scheduledTimeFrom;
    private LocalTime scheduledTimeTo;
}
