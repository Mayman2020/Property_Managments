package com.propertymanagement.modules.vacancy.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConvertInquiryResponse {
    private Long inquiryId;
    private Long tenantId;
    private Long contractId;
}
