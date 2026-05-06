package com.propertymanagement.modules.contract.lease;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.lease.dto.OwnerApprovalDto;
import com.propertymanagement.modules.contract.lease.dto.OwnerRenewalDecisionDto;
import com.propertymanagement.modules.contract.lease.dto.OwnerTerminationDecisionDto;
import com.propertymanagement.modules.user.User;
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

@RestController
@RequestMapping("/owner-portal")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','OWNER')")
public class OwnerApprovalController {

    private final OwnerApprovalService ownerApprovalService;

    @GetMapping("/pending-approvals")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getPendingApprovals(
            @RequestParam(required = false) Long ownerId) {
        return ResponseEntity.ok(ApiResponse.ok(ownerApprovalService.getPendingApprovals(ownerId)));
    }

    @PostMapping("/contracts/{contractId}/decision")
    public ResponseEntity<ApiResponse<ContractResponse>> processApproval(
            @PathVariable Long contractId,
            @Valid @RequestBody OwnerApprovalDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                ownerApprovalService.processApproval(contractId, dto, currentUserId())));
    }

    @GetMapping("/pending-terminations")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getPendingTerminations(
            @RequestParam(required = false) Long ownerId) {
        return ResponseEntity.ok(ApiResponse.ok(ownerApprovalService.getPendingTerminations(ownerId)));
    }

    @GetMapping("/pending-renewals")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getPendingRenewals(
            @RequestParam(required = false) Long ownerId) {
        return ResponseEntity.ok(ApiResponse.ok(ownerApprovalService.getPendingRenewals(ownerId)));
    }

    @PostMapping("/contracts/{contractId}/termination-decision")
    public ResponseEntity<ApiResponse<ContractResponse>> processTerminationDecision(
            @PathVariable Long contractId,
            @Valid @RequestBody OwnerTerminationDecisionDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                ownerApprovalService.processTerminationDecision(contractId, dto, currentUserId())));
    }

    @PostMapping("/contracts/{contractId}/renewal-decision")
    public ResponseEntity<ApiResponse<ContractResponse>> processRenewalDecision(
            @PathVariable Long contractId,
            @Valid @RequestBody OwnerRenewalDecisionDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                ownerApprovalService.processRenewalDecision(contractId, dto, currentUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) return user.getId();
        throw AppException.forbidden("Authenticated user is required");
    }
}
