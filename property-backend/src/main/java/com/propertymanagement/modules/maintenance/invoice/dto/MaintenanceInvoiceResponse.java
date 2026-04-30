package com.propertymanagement.modules.maintenance.invoice.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder
public class MaintenanceInvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Long contractorCompanyId;
    private String companyName;
    private Long propertyId;
    private String propertyName;
    private Long unitId;
    private String unitNumber;
    private Integer periodMonth;
    private Integer periodYear;
    private BigDecimal amount;
    private String description;
    private String fileUrl;
    private String status;
    private String notes;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
