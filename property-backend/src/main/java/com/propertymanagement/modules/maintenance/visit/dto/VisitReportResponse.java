package com.propertymanagement.modules.maintenance.visit.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class VisitReportResponse {
    private Long id;
    private Long requestId;
    private Long officerId;
    private LocalDate visitDate;
    private String visitOutcome;
    private String officerNotes;
    private String workDone;
    private boolean hasPurchase;
    private BigDecimal purchaseAmount;
    private String purchaseNotes;
    private String receiptUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
