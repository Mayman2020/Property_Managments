package com.propertymanagement.modules.maintenance.contract.controller;

import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractResponse;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractCreateRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractDecisionRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractRenewalRequest;
import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractTerminateRequest;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.propertymanagement.modules.maintenance.contract.service.MaintenanceContractService;

@RestController
@RequiredArgsConstructor
public class MaintenanceContractController {

    private final MaintenanceContractService service;

    @GetMapping("/maintenance-contracts")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<Page<MaintenanceContractResponse>>> listAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ownerApprovalStatus,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable, status, ownerApprovalStatus, q)));
    }

    @PostMapping("/maintenance-contracts")
    @RequiresPermission(module = "maintenance", action = "create")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> create(
            @Valid @RequestBody MaintenanceContractCreateRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.createStandalone(body)));
    }

    @GetMapping("/maintenance-contracts/{id}")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @GetMapping("/properties/{propertyId}/maintenance-contracts")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByProperty(propertyId)));
    }

    @GetMapping("/maintenance-companies/{companyId}/contracts")
    @RequiresPermission(module = "maintenance", action = "view")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listByCompany(
            @PathVariable Long companyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByCompany(companyId)));
    }

    @PatchMapping("/maintenance-contracts/{id}/activate")
    @RequiresPermission(module = "maintenance", action = "approve")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(id)));
    }

    @PatchMapping("/maintenance-contracts/{id}/cancel")
    @RequiresPermission(module = "maintenance", action = "edit")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> cancelDraft(
            @PathVariable Long id,
            @RequestBody(required = false) MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelDraft(id, body != null ? body.getNotes() : null)));
    }

    @PatchMapping("/maintenance-contracts/{id}/terminate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> terminate(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) MaintenanceContractTerminateRequest body) {
        if (body == null) {
            return ResponseEntity.ok(ApiResponse.ok(service.terminate(id)));
        }
        return ResponseEntity.ok(ApiResponse.ok(service.requestTermination(id, body)));
    }

    @PatchMapping("/maintenance-contracts/{id}/cancel-termination-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> cancelTerminationRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelTerminationRequest(id)));
    }

    @PostMapping("/maintenance-contracts/{id}/request-renewal")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> requestRenewal(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractRenewalRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.requestRenewal(id, body)));
    }

    @PatchMapping("/maintenance-contracts/{id}/cancel-renewal-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','MAINTENANCE_COMPANY')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> cancelRenewalRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelRenewalRequest(id)));
    }

    @PostMapping("/maintenance-contracts/{id}/termination-decision")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> terminationDecisionStaff(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.decideTermination(id, body, currentUserId())));
    }

    @PostMapping("/maintenance-contracts/{id}/renewal-decision")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> renewalDecisionStaff(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.decideRenewal(id, body, currentUserId())));
    }

    @GetMapping("/owner-portal/maintenance-contracts/drafts")
    @RequiresPermission(module = "owner_portal", action = "view")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> ownerDrafts() {
        return ResponseEntity.ok(ApiResponse.ok(service.listOwnerScopedByStatus("DRAFT")));
    }

    @GetMapping("/owner-portal/maintenance-contracts/pending-terminations")
    @RequiresPermission(module = "owner_portal", action = "view")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> ownerPendingTerminations() {
        return ResponseEntity.ok(ApiResponse.ok(service.listOwnerScopedByStatus("PENDING_TERMINATION_APPROVAL")));
    }

    @GetMapping("/owner-portal/maintenance-contracts/pending-renewals")
    @RequiresPermission(module = "owner_portal", action = "view")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> ownerPendingRenewals() {
        return ResponseEntity.ok(ApiResponse.ok(service.listOwnerScopedByStatus("PENDING_RENEWAL_APPROVAL")));
    }

    @PostMapping("/owner-portal/maintenance-contracts/{id}/decision")
    @RequiresPermission(module = "owner_portal", action = "approve")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> ownerDecision(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        boolean approved = "APPROVED".equalsIgnoreCase(body.getDecision());
        return ResponseEntity.ok(ApiResponse.ok(approved
                ? service.approveDraft(id, currentUserId(), body.getNotes())
                : service.rejectDraft(id, currentUserId(), body.getNotes())));
    }

    @PostMapping("/owner-portal/maintenance-contracts/{id}/termination-decision")
    @RequiresPermission(module = "owner_portal", action = "approve")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> terminationDecision(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceContractDecisionRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(service.decideTermination(id, body, currentUserId())));
    }

    @PostMapping("/owner-portal/maintenance-contracts/{id}/renewal-decision")
    @RequiresPermission(module = "owner_portal", action = "approve")
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
