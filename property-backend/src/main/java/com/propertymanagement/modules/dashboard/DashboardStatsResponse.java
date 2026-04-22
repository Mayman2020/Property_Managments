package com.propertymanagement.modules.dashboard;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class DashboardStatsResponse {
    private long totalProperties;
    private long totalUnits;
    private long rentedUnits;
    private long vacantUnits;
    private long pendingRequests;
    private long inProgressRequests;
    private long completedThisMonth;
    private long lowStockItems;
    private Map<String, Long> requestsByStatus;
    private Map<String, Long> requestsByCategory;
}
