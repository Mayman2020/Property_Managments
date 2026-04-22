package com.propertymanagement.modules.maintenance.request.dto;

import com.propertymanagement.modules.maintenance.request.RequestPriority;
import com.propertymanagement.modules.maintenance.request.RequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
public class MaintenanceRequestResponse {
    private Long id;
    private String requestNumber;
    private Long tenantId;
    private Long unitId;
    private Long propertyId;
    private Long categoryId;
    private String title;
    private String description;
    private RequestPriority priority;
    private RequestStatus status;
    private Long assignedTo;
    private LocalDate scheduledDate;
    private LocalTime scheduledTimeFrom;
    private LocalTime scheduledTimeTo;
    private String tenantNotes;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
