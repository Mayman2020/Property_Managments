package com.propertymanagement.modules.maintenance.request.dto;

import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MaintenanceSlaReportRow {
    private Long id;
    private String requestNumber;
    private Long propertyId;
    private String propertyName;
    private RequestPriority priority;
    private RequestStatus status;
    private LocalDateTime slaDeadline;
    private boolean slaBreached;
    private Long hoursOverdue;
}
