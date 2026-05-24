package com.propertymanagement.modules.tenantportal.controller;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.payment.dto.UploadPaymentProofRequest;
import com.propertymanagement.modules.contract.payment.dto.ScheduleItemResponse;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.tenant.entity.Tenant;
import com.propertymanagement.modules.tenantportal.dto.*;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.propertymanagement.modules.inspection.dto.InspectionResponse;
import com.propertymanagement.modules.inspection.dto.SignInspectionRequest;
import com.propertymanagement.modules.inspection.entity.InspectionSignerRole;
import com.propertymanagement.modules.inspection.service.UnitInspectionService;
import com.propertymanagement.modules.tenantportal.service.TenantPortalService;

@RestController
@RequestMapping("/tenant-portal")
@RequiredArgsConstructor
public class TenantPortalController {

    private final TenantPortalService service;
    private final UnitInspectionService unitInspectionService;

    // ── Tenant endpoints ──────────────────────────────────────────────────

    @GetMapping("/my-contract")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> getMyContract() {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveContract(tenant.getId())));
    }

    @GetMapping("/my-contracts")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getMyContracts() {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.ok(ApiResponse.ok(service.getContractsForTenant(tenant.getId())));
    }

    @GetMapping("/contracts/{id}")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> getTenantContract(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getContractForTenantUser(currentUserId(), id)));
    }

    @GetMapping("/contracts/{id}/inspections")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<List<InspectionResponse>>> getTenantInspections(@PathVariable Long id) {
        unitInspectionService.verifyTenantCanView(id, currentUserId());
        return ResponseEntity.ok(ApiResponse.ok(unitInspectionService.listByContract(id)));
    }

    @PatchMapping("/inspections/{inspectionId}/sign")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<InspectionResponse>> signTenantInspection(
            @PathVariable Long inspectionId,
            @Valid @RequestBody SignInspectionRequest request) {
        if (request.getRole() != InspectionSignerRole.TENANT) {
            throw AppException.badRequest("Tenants may only sign as TENANT");
        }
        return ResponseEntity.ok(ApiResponse.ok(
                unitInspectionService.signInspection(inspectionId, InspectionSignerRole.TENANT, currentUserId())));
    }

    @GetMapping("/contracts/{id}/payment-schedule")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<Page<ScheduleItemResponse>>> getTenantContractSchedule(
            @PathVariable Long id,
            @PageableDefault(size = 240, sort = "dueDate", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getPaymentScheduleForTenantUser(currentUserId(), id, pageable)));
    }

    @PostMapping("/contracts/{contractId}/payment-schedule/{scheduleId}/proof")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<ScheduleItemResponse>> uploadPaymentProof(
            @PathVariable Long contractId,
            @PathVariable Long scheduleId,
            @Valid @RequestBody UploadPaymentProofRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.uploadPaymentProof(currentUserId(), contractId, scheduleId, req)));
    }

    @GetMapping("/receipts")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<List<ReceiptResponse>>> getMyReceipts() {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.ok(ApiResponse.ok(service.getReceipts(tenant.getId())));
    }

    @PostMapping("/receipts")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<ReceiptResponse>> uploadReceipt(@Valid @RequestBody UploadReceiptRequest req) {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.uploadReceipt(tenant.getId(), req)));
    }

    @GetMapping("/contract-requests")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<List<ActionRequestResponse>>> getMyContractRequests() {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.ok(ApiResponse.ok(service.getActionRequests(tenant.getId())));
    }

    @PostMapping("/contract-requests")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<ActionRequestResponse>> createContractRequest(
            @Valid @RequestBody ContractActionRequestDto req) {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createActionRequest(tenant.getId(), req)));
    }

    // ── Admin endpoints ───────────────────────────────────────────────────

    @GetMapping("/admin/contract-requests/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<ActionRequestResponse>>> getPendingRequests() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingActionRequests()));
    }

    @PatchMapping("/admin/contract-requests/{id}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ActionRequestResponse>> reviewRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "APPROVED");
        String adminNotes = body.get("adminNotes");
        return ResponseEntity.ok(ApiResponse.ok(service.reviewActionRequest(id, status, adminNotes, currentUserId())));
    }

    @GetMapping("/admin/receipts/contract/{contractId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<ReceiptResponse>>> getReceiptsByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getReceiptsByContract(contractId)));
    }

    @PatchMapping("/admin/receipts/{id}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ReceiptResponse>> reviewReceipt(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "APPROVED");
        return ResponseEntity.ok(ApiResponse.ok(service.reviewReceipt(id, status, currentUserId())));
    }

    /** Office uploads proof on behalf of tenant — auto-approved, counts as trusted (STAFF). */
    @PostMapping("/admin/receipts/for-tenant")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ReceiptResponse>> createStaffReceiptForTenant(
            @Valid @RequestBody StaffUploadReceiptRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.uploadReceiptAsStaff(currentUserId(), body)));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
