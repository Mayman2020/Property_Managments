package com.propertymanagement.modules.complaint.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintRatingDashboardItemResponse {
    private Long id;
    private Long complaintId;
    private String rating;
    private String raterRole;
    private LocalDateTime ratedAt;
    private String complaintTitle;
    private String complaintType;
    private String status;
    private String priority;
    private Long propertyId;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private Long unitId;
    private String unitNumber;
    private String tenantName;
}
