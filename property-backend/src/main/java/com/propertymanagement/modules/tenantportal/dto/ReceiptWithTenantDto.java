package com.propertymanagement.modules.tenantportal.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ReceiptWithTenantDto {
    private Long id;
    private Long tenantId;
    private String tenantName;
    private String tenantPhone;
    private Long unitId;
    private Long contractId;
    private Integer periodMonth;
    private Integer periodYear;
    private BigDecimal amount;
    private String fileUrl;
    private String notes;
    private String status;
    private LocalDateTime createdAt;
}
