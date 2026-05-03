package com.propertymanagement.modules.tenant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantOnboardingResponse {
    private Long userId;
    private Long tenantId;
    private Long contractId;
    private String contractNumber;
}
