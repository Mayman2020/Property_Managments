package com.propertymanagement.modules.dashboard;

import com.propertymanagement.modules.contract.lease.dto.ContractSummaryDto;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.maintenance.rating.RatingsSummaryResponse;
import com.propertymanagement.modules.maintenance.rating.RatingDashboardItemResponse;
import com.propertymanagement.modules.maintenance.rating.VisitRatingService;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final VisitRatingService visitRatingService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats()));
    }

    @GetMapping("/stats/property/{propertyId}")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStatsByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStatsByProperty(propertyId)));
    }

    @GetMapping("/requests-by-status")
    public ResponseEntity<ApiResponse<List<ChartDataPoint>>> getRequestsByStatus() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getRequestsByStatus()));
    }

    @GetMapping("/requests-by-category")
    public ResponseEntity<ApiResponse<List<ChartDataPoint>>> getRequestsByCategory() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getRequestsByCategory()));
    }

    @GetMapping("/monthly-trend")
    public ResponseEntity<ApiResponse<List<ChartDataPoint>>> getMonthlyTrend(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getMonthlyTrendByProperty(propertyId)));
    }

    @GetMapping("/ratings-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<RatingsSummaryResponse>> getRatingsSummary() {
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getSummary()));
    }

    @GetMapping("/ratings-details")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<RatingDashboardItemResponse>>> getRatingsDetails() {
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getDashboardDetails()));
    }

    @GetMapping("/expiring-contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<ContractSummaryDto>>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getExpiringContracts(days)));
    }

    @GetMapping("/overdue-payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<List<ScheduleItemResponse>>> getOverduePayments() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getOverduePayments()));
    }
}
