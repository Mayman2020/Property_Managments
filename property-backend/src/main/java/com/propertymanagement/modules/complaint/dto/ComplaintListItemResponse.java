package com.propertymanagement.modules.complaint.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplaintListItemResponse {

    private Long id;
    private Long tenantId;
    private String tenantName;
    private String tenantNameAr;
    private String tenantNameEn;
    private Long unitId;
    private String unitNumber;
    private Long propertyId;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private Long contractId;
    private String contractNumber;
    private String contractStatus;
    private String complaintType;
    private String title;
    private String description;
    private String status;
    private String priority;
    private Long maintenanceRequestId;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
