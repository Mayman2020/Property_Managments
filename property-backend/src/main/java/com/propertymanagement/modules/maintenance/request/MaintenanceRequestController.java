package com.propertymanagement.modules.maintenance.request;

import com.propertymanagement.modules.maintenance.request.dto.*;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportRequest;
import com.propertymanagement.modules.maintenance.rating.VisitRatingService;
import com.propertymanagement.modules.maintenance.rating.VisitRatingRequest;
import com.propertymanagement.modules.maintenance.rating.VisitRatingResponse;
import com.propertymanagement.modules.maintenance.visit.dto.VisitReportResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/maintenance/requests")
@RequiredArgsConstructor
public class MaintenanceRequestController {

    private final MaintenanceRequestService requestService;
    private final RequestAttachmentRepository attachmentRepository;
    private final VisitRatingService ratingService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER')")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getAll(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getAll(pageable)));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getByProperty(
            @PathVariable Long propertyId,
            @RequestParam(required = false) RequestStatus status,
            @PageableDefault(size = 10) Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.ok(
                    requestService.getByStatus(status, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.ok(requestService.getByProperty(propertyId, pageable)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getByTenant(
            @PathVariable Long tenantId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getByTenantSecured(tenantId, pageable)));
    }

    @GetMapping("/officer/{officerId}")
    public ResponseEntity<ApiResponse<Page<MaintenanceRequestResponse>>> getByOfficer(
            @PathVariable Long officerId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getByOfficerSecured(officerId, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> create(
            @Valid @RequestBody CreateRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(requestService.create(dto)));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> assign(
            @PathVariable Long id, @Valid @RequestBody AssignRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.assign(id, dto)));
    }

    @PatchMapping("/{id}/schedule")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN', 'MAINTENANCE_OFFICER')")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> schedule(
            @PathVariable Long id, @Valid @RequestBody ScheduleRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.schedule(id, dto)));
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('MAINTENANCE_OFFICER')")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> startWork(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.startWork(id)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> cancel(
            @PathVariable Long id, @RequestBody(required = false) CancelRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                requestService.cancel(id, dto != null ? dto : new CancelRequestDto())));
    }

    @PatchMapping("/{id}/accept-schedule")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> acceptSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.acceptSchedule(id)));
    }

    @PatchMapping("/{id}/reject-schedule")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> rejectSchedule(
            @PathVariable Long id, @Valid @RequestBody RejectScheduleDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.rejectSchedule(id, dto)));
    }

    @PostMapping("/{id}/visit-report")
    @PreAuthorize("hasAnyRole('MAINTENANCE_OFFICER')")
    public ResponseEntity<ApiResponse<VisitReportResponse>> submitVisitReport(
            @PathVariable Long id, @Valid @RequestBody VisitReportRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(requestService.submitVisitReport(id, dto)));
    }

    @GetMapping("/{id}/visit-report")
    public ResponseEntity<ApiResponse<VisitReportResponse>> getVisitReport(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getVisitReport(id)));
    }

    @PostMapping("/{id}/rating")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<VisitRatingResponse>> submitRating(
            @PathVariable Long id, @Valid @RequestBody VisitRatingRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(ratingService.submitRating(id, dto)));
    }

    @GetMapping("/{id}/rating")
    public ResponseEntity<ApiResponse<VisitRatingResponse>> getRating(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ratingService.getRating(id)));
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<ApiResponse<List<RequestAttachment>>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(attachmentRepository.findByRequestId(id)));
    }

    @PostMapping("/{id}/attachments")
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
