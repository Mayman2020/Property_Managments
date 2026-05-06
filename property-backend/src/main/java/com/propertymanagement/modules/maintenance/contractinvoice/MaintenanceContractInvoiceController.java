package com.propertymanagement.modules.maintenance.contractinvoice;

import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceContractInvoiceResponse;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MaintenanceContractInvoiceController {

    private final MaintenanceContractInvoiceService service;

    /** GET /maintenance-invoices */
    @GetMapping("/maintenance-invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractInvoiceResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    /** GET /maintenance-invoices/{id} */
    @GetMapping("/maintenance-invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    /** GET /maintenance-contracts/{contractId}/invoices */
    @GetMapping("/maintenance-contracts/{contractId}/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER','MAINTENANCE_CONTRACTOR')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractInvoiceResponse>>> listByContract(
            @PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByContract(contractId)));
    }

    /** POST /maintenance-contracts/{contractId}/generate-monthly-invoices */
    @PostMapping("/maintenance-contracts/{contractId}/generate-monthly-invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractInvoiceResponse>>> generateMonthly(
            @PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(service.generateMonthlyInvoices(contractId)));
    }

    /** PATCH /maintenance-invoices/{id}/mark-paid */
    @PatchMapping("/maintenance-invoices/{id}/mark-paid")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> markPaid(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.markPaid(id)));
    }

    /** PATCH /maintenance-invoices/{id}/cancel */
    @PatchMapping("/maintenance-invoices/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancel(id)));
    }
}
