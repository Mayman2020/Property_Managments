package com.propertymanagement.modules.tenantportal.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class RenewalRequestWithDetailsDto {
    private Long id;
    private Long tenantId;
    private String tenantName;
    private Long contractId;
    private String contractNumber;
    private BigDecimal currentMonthlyRent;
    private LocalDate currentEndDate;
    private LocalDate requestedDate;
    private String reason;
    private String notes;
    private String attachmentUrl;
    private String status;
    private LocalDateTime createdAt;
}
