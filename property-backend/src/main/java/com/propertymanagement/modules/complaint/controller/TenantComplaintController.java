package com.propertymanagement.modules.complaint.controller;

import com.propertymanagement.modules.complaint.dto.*;
import com.propertymanagement.modules.complaint.entity.ComplaintRating;
import com.propertymanagement.modules.complaint.entity.ComplaintReply;
import com.propertymanagement.modules.complaint.entity.TenantComplaint;
import com.propertymanagement.modules.complaint.service.TenantComplaintService;
import com.propertymanagement.modules.maintenance.request.dto.MaintenanceRequestResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/complaints")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','TENANT')")
public class TenantComplaintController {

    private final TenantComplaintService complaintService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<Page<ComplaintListItemResponse>>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getAll(pageable, status, propertyId)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getMyComplaints() {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getMyComplaints()));
    }

    @GetMapping("/my-active-units")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<List<TenantActiveUnitDto>>> getMyActiveUnits() {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getMyActiveUnits()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ComplaintResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TenantComplaint>> create(
            @Valid @RequestBody ComplaintRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(complaintService.create(request)));
    }

    @PostMapping("/{id}/maintenance-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> createMaintenanceRequest(
            @PathVariable Long id,
            @RequestBody(required = false) CreateMaintenanceFromComplaintDto dto) {
        CreateMaintenanceFromComplaintDto body = dto != null ? dto : new CreateMaintenanceFromComplaintDto();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(complaintService.createMaintenanceRequest(id, body)));
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<ComplaintReply>> addReply(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintReplyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(complaintService.addReply(id, request)));
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<ApiResponse<TenantComplaint>> close(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.closeComplaint(id)));
    }

    @PostMapping("/{id}/rating")
    public ResponseEntity<ApiResponse<ComplaintRating>> submitRating(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintRatingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(complaintService.submitRating(id, request)));
    }

    @GetMapping("/{id}/rating")
    public ResponseEntity<ApiResponse<ComplaintRating>> getRating(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.getRating(id)));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<TenantComplaint>> assign(
            @PathVariable Long id, @RequestBody Map<String, Long> body) {
        return ResponseEntity.ok(ApiResponse.ok(complaintService.assign(id, body.get("officerId"))));
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<TenantComplaint>> resolve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String resolution = body != null ? body.get("resolution") : null;
        return ResponseEntity.ok(ApiResponse.ok(complaintService.resolve(id, resolution)));
    }
}
