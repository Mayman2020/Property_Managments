package com.propertymanagement.modules.tenantportal;

import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.tenant.Tenant;
import com.propertymanagement.modules.tenantportal.dto.*;
import com.propertymanagement.shared.exception.AppException;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tenant-portal")
@RequiredArgsConstructor
public class TenantPortalController {

    private final TenantPortalService service;

    // ── Tenant endpoints ──────────────────────────────────────────────────

    @GetMapping("/my-contract")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> getMyContract() {
        Tenant tenant = service.getTenantByUserId(currentUserId());
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveContract(tenant.getId())));
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ActionRequestResponse>>> getPendingRequests() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingActionRequests()));
    }

    @PatchMapping("/admin/contract-requests/{id}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER')")
    public ResponseEntity<ApiResponse<ActionRequestResponse>> reviewRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "APPROVED");
        String adminNotes = body.get("adminNotes");
        return ResponseEntity.ok(ApiResponse.ok(service.reviewActionRequest(id, status, adminNotes, currentUserId())));
    }

    @GetMapping("/admin/receipts/contract/{contractId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<ReceiptResponse>>> getReceiptsByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getReceiptsByContract(contractId)));
    }

    @PatchMapping("/admin/receipts/{id}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ReceiptResponse>> reviewReceipt(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "APPROVED");
        return ResponseEntity.ok(ApiResponse.ok(service.reviewReceipt(id, status, currentUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
