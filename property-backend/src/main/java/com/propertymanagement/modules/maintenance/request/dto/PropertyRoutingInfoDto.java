package com.propertymanagement.modules.maintenance.request.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PropertyRoutingInfoDto {
    private boolean hasOfficer;
    private boolean hasCompany;
    private Long officerUserId;
    private String officerName;
    private Long companyId;
    private String companyNameAr;
    private String companyNameEn;
}
