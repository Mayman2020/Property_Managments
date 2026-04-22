package com.propertymanagement.modules.maintenance.visit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class VisitReportRequest {
    @NotNull
    private LocalDate visitDate;
    @NotBlank
    private String visitOutcome;  // COMPLETED / TENANT_ABSENT / NEEDS_REVISIT
    private String officerNotes;
    private String workDone;
    private boolean hasPurchase = false;
    private BigDecimal purchaseAmount;
    private String purchaseNotes;
    private String receiptUrl;
    private List<VisitReportItemDto> items;

    @Data
    public static class VisitReportItemDto {
        @NotNull
        private Long itemId;
        @NotNull
        private BigDecimal quantityUsed;
        private String notes;
    }
}
