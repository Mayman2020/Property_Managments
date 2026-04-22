package com.propertymanagement.modules.maintenance.rating;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
}
