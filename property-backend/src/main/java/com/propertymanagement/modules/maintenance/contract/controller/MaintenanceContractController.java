package com.propertymanagement.modules.maintenance.contract.controller;

import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractResponse;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractCreateRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractDecisionRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractRenewalRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractTerminateRequest;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.maintenance.contract.service.MaintenanceContractService;
import com.propertymanagement.modules.owner.entity.Owner;

@RestController
@RequiredArgsConstructor
public class MaintenanceContractController {

    private final MaintenanceContractService service;

    /** GET /maintenance-contracts */
    @GetMapping("/maintenance-contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(status == null || status.isBlank()
                ? service.listAll()
                : service.listByStatus(status)));
    }

    /** POST /maintenance-contracts — standalone contract creation */
    @PostMapping("/maintenance-contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> create(
            @Valid @RequestBody MaintenanceContractCreateRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.createStandalone(body)));
    }

    /** GET /maintenance-contracts/{id} */
    @GetMapping("/maintenance-contracts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    /** GET /properties/{propertyId}/maintenance-contracts */
    @GetMapping("/properties/{propertyId}/maintenance-contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByProperty(propertyId)));
    }

    /** GET /maintenance-companies/{companyId}/contracts */
    @GetMapping("/maintenance-companies/{companyId}/contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listByCompany(
            @PathVariable Long companyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByCompany(companyId)));
    }

    /** PATCH /maintenance-contracts/{id}/activate */
    @PatchMapping("/maintenance-contracts/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(id)));
    }

    @PatchMapping("/maintenance-contracts/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> cancelDraft(
            @PathVariable Long id,
            @RequestBody(required = false) MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelDraft(id, body != null ? body.getNotes() : null)));
    }

    /** PATCH /maintenance-contracts/{id}/terminate */
    @PatchMapping("/maintenance-contracts/{id}/terminate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> terminate(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) MaintenanceContractTerminateRequest body) {
        if (body == null) {
            return ResponseEntity.ok(ApiResponse.ok(service.terminate(id)));
        }
        return ResponseEntity.ok(ApiResponse.ok(service.requestTermination(id, body)));
    }

    @PatchMapping("/maintenance-contracts/{id}/cancel-termination-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> cancelTerminationRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelTerminationRequest(id)));
    }

    @PostMapping("/maintenance-contracts/{id}/request-renewal")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> requestRenewal(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractRenewalRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.requestRenewal(id, body)));
    }

    @PatchMapping("/maintenance-contracts/{id}/cancel-renewal-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> cancelRenewalRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelRenewalRequest(id)));
    }

    @GetMapping("/owner-portal/maintenance-contracts/drafts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> ownerDrafts() {
        return ResponseEntity.ok(ApiResponse.ok(service.listOwnerScopedByStatus("DRAFT")));
    }

    @GetMapping("/owner-portal/maintenance-contracts/pending-terminations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> ownerPendingTerminations() {
        return ResponseEntity.ok(ApiResponse.ok(service.listOwnerScopedByStatus("PENDING_TERMINATION_APPROVAL")));
    }

    @GetMapping("/owner-portal/maintenance-contracts/pending-renewals")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> ownerPendingRenewals() {
        return ResponseEntity.ok(ApiResponse.ok(service.listOwnerScopedByStatus("PENDING_RENEWAL_APPROVAL")));
    }

    @PostMapping("/owner-portal/maintenance-contracts/{id}/decision")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> ownerDecision(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        boolean approved = "APPROVED".equalsIgnoreCase(body.getDecision());
        return ResponseEntity.ok(ApiResponse.ok(approved
                ? service.approveDraft(id, currentUserId(), body.getNotes())
                : service.rejectDraft(id, currentUserId(), body.getNotes())));
    }

    @PostMapping("/owner-portal/maintenance-contracts/{id}/termination-decision")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> terminationDecision(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.decideTermination(id, body, currentUserId())));
    }

    @PostMapping("/owner-portal/maintenance-contracts/{id}/renewal-decision")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> renewalDecision(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.decideRenewal(id, body, currentUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) return user.getId();
        throw AppException.forbidden("Authenticated user is required");
    }
}
