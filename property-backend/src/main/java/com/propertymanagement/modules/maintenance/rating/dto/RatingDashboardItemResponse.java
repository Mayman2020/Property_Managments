package com.propertymanagement.modules.maintenance.rating.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingDashboardItemResponse {
    private Long id;
    private Long requestId;
    private Short rating;
    private String comment;
    private LocalDateTime createdAt;
    private String requestNumber;
    private String requestTitle;
    private Long propertyId;
    private String propertyName;
    private String propertyNameAr;
    private String propertyNameEn;
    private Long unitId;
    private String unitNumber;
    private String tenantName;
    private String tenantNameAr;
    private String tenantNameEn;
    private Long tenantId;
    private String tenantNationalId;
    private String categoryNameAr;
    private String categoryNameEn;
    private RequestStatus requestStatus;
    private Long contractorCompanyId;
}
