package com.propertymanagement.modules.tenantportal;

import com.propertymanagement.modules.contract.lease.dto.ContractResponse;
import com.propertymanagement.modules.contract.renewal.dto.RenewContractDto;
import com.propertymanagement.modules.maintenance.invoice.MaintenanceInvoiceService;
import com.propertymanagement.modules.maintenance.invoice.dto.MaintenanceInvoiceResponse;
import com.propertymanagement.modules.maintenance.invoice.dto.ReviewInvoiceDto;
import com.propertymanagement.modules.tenantportal.dto.ReceiptResponse;
import com.propertymanagement.modules.tenantportal.dto.ReviewReceiptDto;
import com.propertymanagement.modules.user.User;
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

@RestController
@RequestMapping("/accountant-portal")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','ACCOUNTANT')")
public class AccountantPortalController {

    private final AccountantPortalService accountantPortalService;
    private final MaintenanceInvoiceService maintenanceInvoiceService;

    @GetMapping("/receipts")
    public ResponseEntity<ApiResponse<List<ReceiptWithTenantDto>>> getReceipts(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return ResponseEntity.ok(ApiResponse.ok(accountantPortalService.getReceiptsForPeriod(year, month)));
    }

    @PatchMapping("/receipts/{id}/review")
    public ResponseEntity<ApiResponse<ReceiptResponse>> reviewReceipt(
            @PathVariable Long id,
            @Valid @RequestBody ReviewReceiptDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                accountantPortalService.reviewReceipt(id, dto.getStatus(), dto.getNotes(), currentUserId())));
    }

    @GetMapping("/renewal-requests")
    public ResponseEntity<ApiResponse<List<RenewalRequestWithDetailsDto>>> getPendingRenewalRequests() {
        return ResponseEntity.ok(ApiResponse.ok(accountantPortalService.getPendingRenewalRequests()));
    }

    @PostMapping("/renewal-requests/{requestId}/process")
    public ResponseEntity<ApiResponse<ContractResponse>> processRenewal(
            @PathVariable Long requestId,
            @Valid @RequestBody RenewContractDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(accountantPortalService.processRenewal(requestId, dto, currentUserId())));
    }

    // ── Maintenance Invoices ─────────────────────────────────────────────────

    @GetMapping("/maintenance-invoices")
    public ResponseEntity<ApiResponse<List<MaintenanceInvoiceResponse>>> getMaintenanceInvoices(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        return ResponseEntity.ok(ApiResponse.ok(maintenanceInvoiceService.getAllForAccountant(year, month)));
    }

    @PatchMapping("/maintenance-invoices/{id}/review")
    public ResponseEntity<ApiResponse<MaintenanceInvoiceResponse>> reviewMaintenanceInvoice(
            @PathVariable Long id,
            @Valid @RequestBody ReviewInvoiceDto dto) {
        return ResponseEntity.ok(ApiResponse.ok(
                maintenanceInvoiceService.review(id, dto, currentUserId())));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) return user.getId();
        throw AppException.forbidden("Authenticated user is required");
    }
}
