package com.propertymanagement.modules.contract.lease.controller;

import com.propertymanagement.modules.contract.lease.dto.*;
import com.propertymanagement.modules.contract.lease.dto.NoRenewalIntentDto;
import com.propertymanagement.modules.contract.lease.dto.ReportDamagesDto;
import com.propertymanagement.modules.contract.lease.dto.ConfirmDamagePaymentDto;
import com.propertymanagement.modules.contract.renewal.service.ContractRenewalService;
import com.propertymanagement.modules.contract.renewal.dto.ContractRenewalContextResponse;
import com.propertymanagement.modules.contract.renewal.dto.RenewContractDto;
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

import java.util.List;
import com.propertymanagement.modules.contract.lease.entity.ContractStatus;
import com.propertymanagement.modules.contract.lease.service.LeaseContractService;
import com.propertymanagement.modules.inspection.dto.CreateInspectionRequest;
import com.propertymanagement.modules.inspection.dto.InspectionResponse;
import com.propertymanagement.modules.inspection.service.UnitInspectionService;

@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
public class LeaseContractController {

    private final LeaseContractService contractService;
    private final ContractRenewalService renewalService;
    private final UnitInspectionService unitInspectionService;

    @GetMapping
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<Page<ContractResponse>>> getAll(
            @RequestParam(required = false) ContractStatus status,
            @RequestParam(required = false) String ownerApprovalStatus,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.search(pageable, status, ownerApprovalStatus, q)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<ContractResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getById(id)));
    }

    @GetMapping("/{id}/renewal-context")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<ContractRenewalContextResponse>> getRenewalContext(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(renewalService.getRenewalContext(id)));
    }

    @GetMapping("/tenant/{tenantId}")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<List<ContractSummaryDto>>> getByTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getByTenant(tenantId)));
    }

    @GetMapping("/expiring")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<List<ContractSummaryDto>>> getExpiring(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getExpiring(days)));
    }

    @PostMapping
    @RequiresPermission(module = "contracts", action = "create")
    public ResponseEntity<ApiResponse<ContractResponse>> create(
            @Valid @RequestBody CreateContractDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contractService.create(dto, currentUserId())));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractResponse>> update(
            @PathVariable Long id, @Valid @RequestBody CreateContractDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.update(id, dto, currentUserId())));
    }

    @PatchMapping("/{id}/submit-for-owner-approval")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractResponse>> submitForOwnerApproval(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.submitForOwnerApproval(id, currentUserId())));
    }

    @PatchMapping("/{id}/activate")
    @RequiresPermission(module = "contracts", action = "approve")
    public ResponseEntity<ApiResponse<ContractResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.activate(id, currentUserId())));
    }

    @PatchMapping("/{id}/cancel")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelDraft(
            @PathVariable Long id, @Valid @RequestBody(required = false) CancelContractDto dto) {
        String reason = dto != null ? dto.getReason() : null;
        return ResponseEntity.ok(ApiResponse.ok(contractService.cancelDraft(id, reason, currentUserId())));
    }

    @PatchMapping("/{id}/terminate")
    @RequiresPermission(module = "contracts", action = "delete")
    public ResponseEntity<ApiResponse<ContractResponse>> terminate(
            @PathVariable Long id, @Valid @RequestBody TerminateContractDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.terminate(id, dto, currentUserId())));
    }

    @PatchMapping("/{id}/cancel-termination-request")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelTerminationRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                contractService.cancelTerminationRequest(id, currentUserId())));
    }

    @PostMapping("/{id}/renew")
    @RequiresPermission(module = "contracts", action = "create")
    public ResponseEntity<ApiResponse<ContractResponse>> renew(
            @PathVariable Long id, @Valid @RequestBody RenewContractDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(renewalService.renew(id, dto, currentUserId())));
    }

    @PostMapping("/{id}/request-renewal")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractResponse>> requestRenewal(
            @PathVariable Long id, @Valid @RequestBody ContractRenewalRequestDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.requestRenewal(id, dto, currentUserId())));
    }

    @PatchMapping("/{id}/cancel-renewal-request")
    @RequiresPermission(module = "contracts", action = "edit")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelRenewalRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.cancelRenewalRequest(id, currentUserId())));
    }

    @PostMapping("/{id}/no-renewal-intent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ContractResponse>> noRenewalIntent(
            @PathVariable Long id,
            @RequestBody(required = false) NoRenewalIntentDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.recordNoRenewalIntent(id, currentUserId(), dto)));
    }

    @PostMapping("/{id}/return-deposit")
    @RequiresPermission(module = "contracts", action = "approve")
    public ResponseEntity<ApiResponse<ContractResponse>> returnDeposit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.returnDeposit(id, currentUserId())));
    }

    @PostMapping("/{id}/report-damages")
    @RequiresPermission(module = "contracts", action = "approve")
    public ResponseEntity<ApiResponse<ContractResponse>> reportDamages(
            @PathVariable Long id, @Valid @RequestBody ReportDamagesDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.reportDamages(id, currentUserId(), dto)));
    }

    @PostMapping("/{id}/submit-damage-receipt")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ContractResponse>> submitDamageReceipt(
            @PathVariable Long id, @RequestBody ConfirmDamagePaymentDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                contractService.submitDamagePaymentReceipt(id, currentUserId(), dto.getReceiptUrl())));
    }

    @PostMapping("/{id}/confirm-damage-payment")
    @RequiresPermission(module = "contracts", action = "approve")
    public ResponseEntity<ApiResponse<ContractResponse>> confirmDamagePayment(
            @PathVariable Long id, @RequestBody(required = false) ConfirmDamagePaymentDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.confirmDamagePayment(id, currentUserId(),
                dto != null ? dto : new ConfirmDamagePaymentDto())));
    }

    @GetMapping("/{contractId}/inspections")
    @RequiresPermission(module = "contracts", action = "view")
    public ResponseEntity<ApiResponse<List<InspectionResponse>>> listInspections(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(unitInspectionService.listByContract(contractId)));
    }

    @PostMapping("/{contractId}/inspections")
    @RequiresPermission(module = "contracts", action = "create")
    public ResponseEntity<ApiResponse<InspectionResponse>> createInspection(
            @PathVariable Long contractId,
            @Valid @RequestBody CreateInspectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(unitInspectionService.createInspection(
                        contractId, request.getType(), currentUserId())));
    }

    @PostMapping("/{id}/clear-unit")
    @RequiresPermission(module = "contracts", action = "approve")
    public ResponseEntity<ApiResponse<ContractResponse>> clearUnit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.clearUnit(id, currentUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) return user.getId();
        throw AppException.forbidden("Authenticated user is required");
    }
}
