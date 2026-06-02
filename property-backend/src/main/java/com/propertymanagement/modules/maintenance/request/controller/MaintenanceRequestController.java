package com.propertymanagement.modules.maintenance.request.controller;

import com.propertymanagement.modules.maintenance.request.dto.*;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportRequest;
import com.propertymanagement.modules.maintenance.rating.service.VisitRatingService;
import com.propertymanagement.modules.maintenance.rating.dto.VisitRatingRequest;
import com.propertymanagement.modules.maintenance.rating.dto.VisitRatingResponse;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportResponse;
import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.shared.exception.AppException;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import com.propertymanagement.modules.maintenance.request.service.MaintenanceRequestService;
import com.propertymanagement.modules.maintenance.request.repository.RequestAttachmentRepository;
import com.propertymanagement.modules.maintenance.request.entity.RequestAttachment;
import com.propertymanagement.modules.maintenance.request.entity.RequestStatus;
import com.propertymanagement.modules.maintenance.request.entity.RequestPriority;

@RestController
@RequestMapping("/maintenance/requests")
@RequiredArgsConstructor
public class MaintenanceRequestController {

    private final MaintenanceRequestService requestService;
    private final RequestAttachmentRepository attachmentRepository;
    private final VisitRatingService ratingService;

    /** Admin/officer view — requires maintenance.view or schedule.view */
    @GetMapping("/sla-report")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<MaintenanceSlaReportRow>>> slaReport(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(defaultValue = "false") boolean breachedOnly) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getSlaReport(propertyId, breachedOnly)));
    }

    @GetMapping
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getAll(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) RequestPriority priority,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getAll(status, priority, propertyId, pageable)));
    }

    @GetMapping("/property/{propertyId}")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getByProperty(
            @PathVariable Long propertyId,
            @RequestParam(required = false) RequestStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.ok(requestService.getByStatus(status, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.ok(requestService.getByProperty(propertyId, pageable)));
    }

    /** Tenant-scoped: checks my_requests.view permission */
    @GetMapping("/tenant/{tenantId}")
    @RequiresPermission(module = "my_requests", action = "view")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getByTenant(
            @PathVariable Long tenantId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getByTenantSecured(tenantId, pageable)));
    }

    @GetMapping("/officer/{officerId}/open-count")
    @RequiresPermission(module = "schedule", action = "view")
    public ResponseEntity<ApiResponse<Long>> getOfficerOpenCount(@PathVariable Long officerId) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.countOpenAssignedToOfficerSecured(officerId)));
    }

    @GetMapping("/officer/{officerId}")
    @RequiresPermission(module = "schedule", action = "view")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getByOfficer(
            @PathVariable Long officerId,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getByOfficerSecured(officerId, propertyId, pageable)));
    }

    @GetMapping("/company-queue")
    @RequiresPermission(module = "schedule", action = "view")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getCompanyQueue(
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getCompanyQueueForCurrentOfficer(propertyId, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getById(id)));
    }

    @GetMapping("/routing-info")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<PropertyRoutingInfoDto>> routingInfo(
            @RequestParam Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getRoutingInfo(propertyId)));
    }

    /** Staff/tenant create — admin uses maintenance.create, tenant uses my_requests.create (new_request) */
    @PostMapping
    @RequiresPermission(module = "maintenance", action = "create")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> create(
            @Valid @RequestBody CreateRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(requestService.create(dto)));
    }

    @PatchMapping("/{id}/assign")
    @RequiresPermission(module = "maintenance", action = "assign")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> assign(
            @PathVariable Long id, @Valid @RequestBody AssignRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.assign(id, dto)));
    }

    @PatchMapping("/{id}/schedule")
    @RequiresPermission(module = "maintenance", action = "schedule")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> schedule(
            @PathVariable Long id, @Valid @RequestBody ScheduleRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.schedule(id, dto)));
    }

    @PatchMapping("/{id}/start")
    @RequiresPermission(module = "schedule", action = "start")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> startWork(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.startWork(id)));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> cancel(
            @PathVariable Long id, @RequestBody(required = false) CancelRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                requestService.cancel(id, dto != null ? dto : new CancelRequestDto())));
    }

    /** Tenant accepts a scheduled visit */
    @PatchMapping("/{id}/accept-schedule")
    @RequiresPermission(module = "my_requests", action = "approve")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> acceptSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.acceptSchedule(id)));
    }

    /** Tenant rejects a scheduled visit */
    @PatchMapping("/{id}/reject-schedule")
    @RequiresPermission(module = "my_requests", action = "reject")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> rejectSchedule(
            @PathVariable Long id, @Valid @RequestBody RejectScheduleDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.rejectSchedule(id, dto)));
    }

    @PostMapping("/{id}/visit-report")
    @RequiresPermission(module = "schedule", action = "submit")
    public ResponseEntity<ApiResponse<VisitReportResponse>> submitVisitReport(
            @PathVariable Long id, @Valid @RequestBody VisitReportRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(requestService.submitVisitReport(id, dto)));
    }

    @GetMapping("/{id}/visit-report")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VisitReportResponse>> getVisitReport(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getVisitReport(id)));
    }

    @PostMapping("/{id}/rating")
    @RequiresPermission(module = "my_requests", action = "rate")
    public ResponseEntity<ApiResponse<VisitRatingResponse>> submitRating(
            @PathVariable Long id, @Valid @RequestBody VisitRatingRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(ratingService.submitRating(id, dto)));
    }

    @GetMapping("/{id}/rating")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VisitRatingResponse>> getRating(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ratingService.getRating(id)));
    }

    @GetMapping("/{id}/attachments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<RequestAttachment>>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(attachmentRepository.findByRequestId(id)));
    }

    @PostMapping("/{id}/attachments")
    @RequiresPermission(module = "maintenance", action = "create")
    public ResponseEntity<ApiResponse<RequestAttachment>> addAttachment(
            @PathVariable Long id,
            @Valid @RequestBody AttachmentRequest dto) {
        RequestAttachment attachment = RequestAttachment.builder()
                .requestId(id)
                .fileUrl(dto.getFileUrl())
                .fileType(dto.getFileType())
                .fileName(dto.getFileName())
                .fileSizeKb(dto.getFileSizeKb())
                .uploadedBy(currentUserId())
                .uploadedAt(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(attachmentRepository.save(attachment)));
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    @RequiresPermission(module = "maintenance", action = "delete")
    public ResponseEntity<ApiResponse<Void>> deleteAttachment(
            @PathVariable Long id,
            @PathVariable Long attachmentId) {
        attachmentRepository.deleteById(attachmentId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
