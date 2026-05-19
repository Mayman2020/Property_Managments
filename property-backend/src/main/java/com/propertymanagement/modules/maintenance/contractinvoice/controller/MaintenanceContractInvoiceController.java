package com.propertymanagement.modules.maintenance.contractinvoice.controller;

import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceContractInvoiceResponse;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceInvoiceInstallmentPaymentRequest;
import com.propertymanagement.modules.maintenance.contractinvoice.dto.MaintenanceInvoicePaymentPlanRequest;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.propertymanagement.modules.maintenance.contractinvoice.service.MaintenanceContractInvoiceService;

@RestController
@RequiredArgsConstructor
public class MaintenanceContractInvoiceController {

    private final MaintenanceContractInvoiceService service;

    /** GET /maintenance-invoices */
    @GetMapping("/maintenance-invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractInvoiceResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    /** GET /maintenance-invoices/{id} */
    @GetMapping("/maintenance-invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    /** GET /maintenance-contracts/{contractId}/invoices */
    @GetMapping("/maintenance-contracts/{contractId}/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','OWNER','PROCEDURES_CLERK','MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> markPaid(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(service.markPaid(
                id,
                body != null ? body.get("receiptUrl") : null,
                body != null ? body.get("notes") : null)));
    }

    @PostMapping("/maintenance-invoices/{id}/payment-plan")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> createPaymentPlan(
            @PathVariable Long id,
            @RequestBody MaintenanceInvoicePaymentPlanRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.createPaymentPlan(id, request)));
    }

    @PatchMapping("/maintenance-invoices/{invoiceId}/payments/{paymentId}/mark-paid")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> markInstallmentPaid(
            @PathVariable Long invoiceId,
            @PathVariable Long paymentId,
            @RequestBody MaintenanceInvoiceInstallmentPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.markInstallmentPaid(invoiceId, paymentId, request)));
    }

    /** PATCH /maintenance-invoices/{id}/cancel */
    @PatchMapping("/maintenance-invoices/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractInvoiceResponse>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancel(id)));
    }
}
