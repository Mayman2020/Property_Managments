package com.propertymanagement.modules.reports.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
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
}
