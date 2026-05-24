package com.propertymanagement.modules.ownerportal.controller;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerAmendDraftRequest;
import com.propertymanagement.modules.ownerportal.dto.OwnerDashboardResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerPropertyResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerRejectDraftRequest;
import com.propertymanagement.modules.ownerportal.dto.UnitOptionDto;
import com.propertymanagement.modules.ownerportal.dto.OwnerRevenueShareResponse;
import com.propertymanagement.modules.ownerportal.dto.OwnerStatementResponse;
import com.propertymanagement.modules.ownerportal.service.OwnerRevenueQueryService;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;
import com.propertymanagement.modules.ownerportal.service.OwnerPortalService;
import com.propertymanagement.modules.ownerportal.service.OwnerPortalDraftContractService;
import com.propertymanagement.modules.owner.entity.Owner;
import com.propertymanagement.modules.unit.entity.Unit;

@RestController
@RequestMapping("/owner-portal")
@RequiredArgsConstructor
public class OwnerPortalController {

    private final OwnerPortalService service;
    private final OwnerPortalDraftContractService draftContractService;
    private final OwnerRevenueQueryService ownerRevenueQueryService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<OwnerDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboard()));
    }

    @GetMapping("/statements")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<OwnerStatementResponse>>> statements() {
        return ResponseEntity.ok(ApiResponse.ok(service.getStatements()));
    }

    @GetMapping("/admin/owners/{ownerId}/revenue-shares")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<OwnerRevenueShareResponse>>> adminRevenueShares(
            @PathVariable Long ownerId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        YearMonth period = (year != null && month != null)
                ? YearMonth.of(year, month)
                : YearMonth.now();
        return ResponseEntity.ok(ApiResponse.ok(
                ownerRevenueQueryService.listSharesForOwner(ownerId, period.getYear(), period.getMonthValue())));
    }

    @GetMapping("/properties")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<OwnerPropertyResponse>>> properties() {
        return ResponseEntity.ok(ApiResponse.ok(service.getProperties()));
    }

    @GetMapping("/draft-contracts")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> listDraftContracts() {
        return ResponseEntity.ok(ApiResponse.ok(draftContractService.listDraftsForCurrentOwner()));
    }

    @GetMapping("/draft-contracts/{id}/unit-options")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<UnitOptionDto>>> listDraftUnitOptions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(draftContractService.listUnitOptionsForDraftAmend(id)));
    }

    @PatchMapping("/draft-contracts/{id}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<ContractResponse>> rejectDraft(
            @PathVariable Long id,
            @Valid @RequestBody OwnerRejectDraftRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(draftContractService.rejectDraft(id, body.getReason())));
    }

    @PatchMapping("/draft-contracts/{id}/amend")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<ContractResponse>> amendDraft(
            @PathVariable Long id,
            @Valid @RequestBody OwnerAmendDraftRequest body) {
        return ResponseEntity.ok(ApiResponse.ok(draftContractService.amendDraft(id, body)));
    }
}
