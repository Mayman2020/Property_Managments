package com.propertymanagement.modules.dashboard.controller;

import com.propertymanagement.modules.dashboard.dto.ChartDataPointDTO;
import com.propertymanagement.modules.dashboard.dto.DashboardStatsResponseDTO;
import com.propertymanagement.modules.dashboard.dto.RecentActivityItemDTO;
import com.propertymanagement.modules.dashboard.service.DashboardService;
import com.propertymanagement.modules.complaint.dto.ComplaintRatingDashboardItemResponse;
import com.propertymanagement.modules.complaint.dto.ComplaintRatingsSummaryResponse;
import com.propertymanagement.modules.complaint.repository.ComplaintRatingRepository;
import com.propertymanagement.modules.contract.lease.dto.ContractSummaryDto;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.maintenance.rating.dto.RatingsSummaryResponse;
import com.propertymanagement.modules.maintenance.rating.dto.RatingDashboardItemResponse;
import com.propertymanagement.modules.maintenance.rating.service.VisitRatingService;
import com.propertymanagement.shared.response.ApiResponse;
import com.propertymanagement.shared.security.PropertyScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.property.entity.Property;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final VisitRatingService visitRatingService;
    private final ComplaintRatingRepository complaintRatingRepository;
    private final PropertyScopeService propertyScopeService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponseDTO>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats()));
    }

    @GetMapping("/stats/property/{propertyId}")
    public ResponseEntity<ApiResponse<DashboardStatsResponseDTO>> getStatsByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStatsByProperty(propertyId)));
    }

    @GetMapping("/requests-by-status")
    public ResponseEntity<ApiResponse<List<ChartDataPointDTO>>> getRequestsByStatus() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getRequestsByStatus()));
    }

    @GetMapping("/requests-by-category")
    public ResponseEntity<ApiResponse<List<ChartDataPointDTO>>> getRequestsByCategory() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getRequestsByCategory()));
    }

    @GetMapping("/monthly-trend")
    public ResponseEntity<ApiResponse<List<ChartDataPointDTO>>> getMonthlyTrend(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getMonthlyTrendByProperty(propertyId)));
    }

    @GetMapping("/ratings-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','PROCEDURES_CLERK','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY','PROPERTY_GUARD')")
    public ResponseEntity<ApiResponse<RatingsSummaryResponse>> getRatingsSummary() {
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getSummary()));
    }

    @GetMapping("/ratings-details")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','PROCEDURES_CLERK','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY','PROPERTY_GUARD')")
    public ResponseEntity<ApiResponse<List<RatingDashboardItemResponse>>> getRatingsDetails() {
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getDashboardDetails(scope)));
    }

    @GetMapping("/complaint-ratings-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','PROCEDURES_CLERK','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY','PROPERTY_GUARD')")
    public ResponseEntity<ApiResponse<ComplaintRatingsSummaryResponse>> getComplaintRatingsSummary() {
        return ResponseEntity.ok(ApiResponse.ok(ComplaintRatingsSummaryResponse.builder()
                .averageRating(complaintRatingRepository.getAverageRatingScore() == null ? 0.0 : complaintRatingRepository.getAverageRatingScore())
                .totalRatings(complaintRatingRepository.count())
                .veryDissatisfied(complaintRatingRepository.countByRating("VERY_DISSATISFIED"))
                .dissatisfied(complaintRatingRepository.countByRating("DISSATISFIED"))
                .satisfied(complaintRatingRepository.countByRating("SATISFIED"))
                .verySatisfied(complaintRatingRepository.countByRating("VERY_SATISFIED"))
                .build()));
    }

    @GetMapping("/complaint-ratings-details")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','PROCEDURES_CLERK','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY','PROPERTY_GUARD')")
    public ResponseEntity<ApiResponse<List<ComplaintRatingDashboardItemResponse>>> getComplaintRatingsDetails() {
        Set<Long> scope = propertyScopeService.propertyIdsOrNullIfUnrestricted();
        if (scope != null && scope.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
        List<ComplaintRatingDashboardItemResponse> result = (scope == null)
                ? complaintRatingRepository.findDashboardDetails()
                : complaintRatingRepository.findDashboardDetailsByPropertyIds(scope);
        return ResponseEntity.ok(ApiResponse.ok(result));
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

    @GetMapping("/recent-activity")
    public ResponseEntity<ApiResponse<List<RecentActivityItemDTO>>> getRecentActivity(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(required = false) Long propertyId) {
        int capped = Math.min(Math.max(limit, 1), 50);
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getRecentActivity(capped, propertyId)));
    }
}
