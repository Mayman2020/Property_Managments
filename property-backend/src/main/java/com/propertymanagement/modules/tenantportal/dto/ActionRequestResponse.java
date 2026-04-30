package com.propertymanagement.modules.tenantportal.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ActionRequestResponse {
    private Long id;
    private Long tenantId;
    private Long contractId;
    private String actionType;
    private LocalDate requestedDate;
    private String reason;
    private String notes;
    private String attachmentUrl;
    private String status;
    private String adminNotes;
    private LocalDateTime createdAt;
}
