package com.propertymanagement.modules.complaint.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TenantActiveUnitDto {
    private Long contractId;
    private Long unitId;
    private String unitNumber;
    private Long propertyId;
    private String propertyName;
    private String propertyNameAr;
}
