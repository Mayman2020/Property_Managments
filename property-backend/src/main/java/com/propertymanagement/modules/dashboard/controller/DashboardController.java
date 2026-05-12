package com.propertymanagement.modules.dashboard.controller;

import com.propertymanagement.modules.dashboard.dto.ChartDataPointDTO;
import com.propertymanagement.modules.dashboard.dto.DashboardStatsResponseDTO;
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
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.property.entity.Property;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final VisitRatingService visitRatingService;
    private final ComplaintRatingRepository complaintRatingRepository;

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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<RatingsSummaryResponse>> getRatingsSummary() {
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getSummary()));
    }

    @GetMapping("/ratings-details")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<RatingDashboardItemResponse>>> getRatingsDetails() {
        return ResponseEntity.ok(ApiResponse.ok(visitRatingService.getDashboardDetails()));
    }

    @GetMapping("/complaint-ratings-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<ComplaintRatingDashboardItemResponse>>> getComplaintRatingsDetails() {
        return ResponseEntity.ok(ApiResponse.ok(complaintRatingRepository.findDashboardDetails()));
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
