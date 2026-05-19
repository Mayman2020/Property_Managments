package com.propertymanagement.modules.reports.controller;

import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.reports.dto.*;
import com.propertymanagement.modules.reports.service.ReportsService;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportsController {

    private final ReportsService service;

    @GetMapping("/contract-expiry")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<List<ContractExpiryRow>>> contractExpiry(
            @RequestParam(defaultValue = "90") int daysAhead,
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getExpiringContracts(daysAhead, propertyId)));
    }

    @GetMapping("/occupancy")
    @RequiresPermission(module = "properties", action = "view")
    public ResponseEntity<ApiResponse<OccupancyAnalyticsResponse>> occupancy(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getOccupancyAnalytics(propertyId)));
    }

    @GetMapping("/maintenance")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<MaintenanceReportResponse>> maintenance(
            @RequestParam(required = false) Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMaintenanceReport(propertyId)));
    }

    @GetMapping("/budget-vs-actual")
    @RequiresPermission(module = "finance", action = "view")
    public ResponseEntity<ApiResponse<BudgetVsActualResponse>> budgetVsActual(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.ok(service.getBudgetVsActual(propertyId, year)));
    }
}
