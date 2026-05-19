package com.propertymanagement.modules.maintenance.assignment.controller;

import com.propertymanagement.modules.maintenance.assignment.dto.AssignMaintenanceRequest;
import com.propertymanagement.modules.maintenance.assignment.dto.MaintenanceAssignmentResponse;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.maintenance.assignment.service.MaintenanceAssignmentService;

@RestController
@RequestMapping("/properties/{propertyId}/maintenance-assignments")
@RequiredArgsConstructor
public class MaintenanceAssignmentController {

    private final MaintenanceAssignmentService service;

    /** GET /properties/{id}/maintenance-assignments */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<List<MaintenanceAssignmentResponse>>> list(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByProperty(propertyId)));
    }

    /** POST /properties/{id}/maintenance-assignments */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<MaintenanceAssignmentResponse>> assign(
            @PathVariable Long propertyId,
            @RequestBody AssignMaintenanceRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.assign(propertyId, request)));
    }

    /** PATCH /properties/{id}/maintenance-assignments/{assignmentId}/end */
    @PatchMapping("/{assignmentId}/end")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<MaintenanceAssignmentResponse>> end(
            @PathVariable Long propertyId,
            @PathVariable Long assignmentId) {
        return ResponseEntity.ok(ApiResponse.ok(service.endAssignment(propertyId, assignmentId)));
    }
}
