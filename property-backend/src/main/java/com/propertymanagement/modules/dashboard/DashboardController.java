package com.propertymanagement.modules.dashboard;

import com.propertymanagement.modules.maintenance.rating.RatingsSummaryResponse;
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
    public ResponseEntity<ApiResponse<List<ChartDataPoint>>> getMonthlyTrend() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getMonthlyTrend()));
    }

    @GetMapping("/ratings-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<RatingsSummaryResponse>> getRatingsSummary() {
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getSummary()));
    }
}
