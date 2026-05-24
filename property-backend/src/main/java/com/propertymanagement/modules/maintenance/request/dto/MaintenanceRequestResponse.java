package com.propertymanagement.modules.maintenance.request.dto;

import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
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
    /** When set with assignedTo null, request is waiting for the contractor company to assign an officer. */
    private Long contractorCompanyId;
    private LocalDate scheduledDate;
    private LocalTime scheduledTimeFrom;
    private LocalTime scheduledTimeTo;
    private String tenantNotes;
    private LocalDateTime closedAt;
    private Boolean scheduleAccepted;
    private String scheduleRejectionNote;
    private String tenantName;
    private String assignedOfficerName;
    private String assignedOfficerPhone;
    private String assignedOfficerCompanyName;
    private String assignedOfficerCompanyNameAr;
    private String assignedOfficerCompanyNameEn;
    private String contractorCompanyName;
    private String contractorCompanyNameAr;
    private String contractorCompanyNameEn;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private String unitNumber;
    private String categoryNameAr;
    private String categoryNameEn;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime slaDeadline;
    private Boolean slaBreached;
    private Long hoursOverdue;
    private Long createdBy;
    private String createdByName;
    private Long modifiedBy;
    private String modifiedByName;
}
