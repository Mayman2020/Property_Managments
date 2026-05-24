package com.propertymanagement.modules.reports.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Getter
@Builder
public class MaintenanceReportResponse {
    private long totalRequests;
    private long openRequests;
    private long inProgressRequests;
    private long completedRequests;
    private long cancelledRequests;
    private long overdueRequests;
    private BigDecimal totalInvoicedAmount;
    private List<StatusBreakdown> byStatus;
    private List<CategoryBreakdown> byCategory;
    private List<RequestSummary> requests;

    @Getter
    @Builder
    public static class StatusBreakdown {
        private String status;
        private long count;
    }

    @Getter
    @Builder
    public static class CategoryBreakdown {
        private String categoryName;
        private long count;
        private BigDecimal totalCost;
    }

    @Getter
    @Builder
    public static class RequestSummary {
        private Long id;
        private String requestNumber;
        private String title;
        private String description;
        private String status;
        private String priority;
        private Long propertyId;
        private String propertyName;
        private String propertyNameAr;
        private String propertyNameEn;
        private Long unitId;
        private String unitNumber;
        private Long tenantId;
        private String tenantName;
        private String tenantNameAr;
        private String tenantNameEn;
        private Long assignedTo;
        private LocalDate scheduledDate;
        private LocalTime scheduledTimeFrom;
        private LocalTime scheduledTimeTo;
        private LocalDateTime slaDeadline;
        private boolean slaBreached;
        private LocalDateTime createdAt;
    }
}
