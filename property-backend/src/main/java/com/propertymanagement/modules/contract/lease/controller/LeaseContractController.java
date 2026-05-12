package com.propertymanagement.modules.contract.lease.controller;

import com.propertymanagement.modules.contract.lease.dto.*;
import com.propertymanagement.modules.contract.renewal.service.ContractRenewalService;
import com.propertymanagement.modules.contract.renewal.dto.ContractRenewalContextResponse;
import com.propertymanagement.modules.contract.renewal.dto.RenewContractDto;
import com.propertymanagement.modules.user.entity.User;
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

import java.util.List;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.tenant.entity.Tenant;

@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
public class LeaseContractController {

    private final LeaseContractService contractService;
    private final ContractRenewalService renewalService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ContractResponse>>> getAll(
            @RequestParam(required = false) ContractStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.ok(contractService.getByStatus(status, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.ok(contractService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getById(id)));
    }

    @GetMapping("/{id}/renewal-context")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractRenewalContextResponse>> getRenewalContext(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(renewalService.getRenewalContext(id)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<ContractSummaryDto>>> getByTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getByTenant(tenantId)));
    }

    @GetMapping("/expiring")
    public ResponseEntity<ApiResponse<List<ContractSummaryDto>>> getExpiring(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getExpiring(days)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContractResponse>> create(
            @Valid @RequestBody CreateContractDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contractService.create(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractResponse>> update(
            @PathVariable Long id, @Valid @RequestBody CreateContractDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.update(id, dto, currentUserId())));
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER')")
    public ResponseEntity<ApiResponse<ContractResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.activate(id, currentUserId())));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelDraft(
            @PathVariable Long id, @Valid @RequestBody(required = false) CancelContractDto dto) {
        String reason = dto != null ? dto.getReason() : null;
        return ResponseEntity.ok(ApiResponse.ok(contractService.cancelDraft(id, reason, currentUserId())));
    }

    @PatchMapping("/{id}/terminate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> terminate(
            @PathVariable Long id, @Valid @RequestBody TerminateContractDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.terminate(id, dto, currentUserId())));
    }

    /**
     * Staff withdraw a pending termination request before the owner decides.
     * Reverts the contract to {@link ContractStatus#ACTIVE}.
     */
    @PatchMapping("/{id}/cancel-termination-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelTerminationRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                contractService.cancelTerminationRequest(id, currentUserId())));
    }

    @PostMapping("/{id}/renew")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> renew(
            @PathVariable Long id, @Valid @RequestBody RenewContractDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(renewalService.renew(id, dto, currentUserId())));
    }

    @PostMapping("/{id}/request-renewal")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> requestRenewal(
            @PathVariable Long id, @Valid @RequestBody ContractRenewalRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.requestRenewal(id, dto, currentUserId())));
    }

    @PatchMapping("/{id}/cancel-renewal-request")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelRenewalRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.cancelRenewalRequest(id, currentUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) return user.getId();
        throw AppException.forbidden("Authenticated user is required");
    }
}
