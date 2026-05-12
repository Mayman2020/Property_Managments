package com.propertymanagement.modules.tenantportal.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.propertymanagement.modules.tenant.entity.Tenant;

@Data
@Builder
public class ReceiptResponse {
    private Long id;
    private Long tenantId;
    private Long contractId;
    private Integer periodMonth;
    private Integer periodYear;
    private BigDecimal amount;
    private String fileUrl;
    private String notes;
    private String status;
    /** TENANT | STAFF */
    private String uploadSource;
    private LocalDateTime createdAt;
}
