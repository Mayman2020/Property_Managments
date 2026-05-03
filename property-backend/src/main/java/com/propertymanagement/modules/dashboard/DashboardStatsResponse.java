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
    private long openMaintenanceRequests;
    private long totalInventoryItems;
    private Map<String, Long> requestsByStatus;
    private Map<String, Long> requestsByCategory;

    // Contract stats
    private long activeContracts;
    /** Leases created but not yet activated (e.g. after tenant onboarding). */
    private long draftContracts;
    private long expiringIn30Days;
    private long overduePayments;
    private long openViolations;
    private long openComplaints;
}
