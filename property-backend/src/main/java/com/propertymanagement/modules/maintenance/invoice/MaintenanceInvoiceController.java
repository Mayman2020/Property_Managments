package com.propertymanagement.modules.maintenance.invoice;

import com.propertymanagement.modules.maintenance.invoice.dto.MaintenanceInvoiceResponse;
import com.propertymanagement.modules.maintenance.invoice.dto.SubmitInvoiceDto;
import com.propertymanagement.modules.property.Property;
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
@RequestMapping("/maintenance-invoices")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MAINTENANCE_OFFICER_INTERNAL','MAINTENANCE_OFFICER_COMPANY','MAINTENANCE_COMPANY')")
public class MaintenanceInvoiceController {

    private final MaintenanceInvoiceService invoiceService;

    /** Submit a new invoice (contractor company officer) */
    @PostMapping
    public ResponseEntity<ApiResponse<MaintenanceInvoiceResponse>> submit(
            @Valid @RequestBody SubmitInvoiceDto dto) {
        User user = currentUser();
        if (user.getContractorCompanyId() == null) {
            throw AppException.forbidden("Only contractor company officers can submit invoices");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(invoiceService.submit(user.getContractorCompanyId(), user.getId(), dto)));
    }

    /** List own company's invoices */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<MaintenanceInvoiceResponse>>> getMyInvoices(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        User user = currentUser();
        if (user.getContractorCompanyId() == null) {
            throw AppException.forbidden("Only contractor company officers can view invoices");
        }
        return ResponseEntity.ok(ApiResponse.ok(
                invoiceService.getMyInvoices(user.getContractorCompanyId(), year, month)));
    }

    /** Properties this contractor company serves */
    @GetMapping("/my-properties")
    public ResponseEntity<ApiResponse<List<Property>>> getMyProperties() {
        User user = currentUser();
        if (user.getContractorCompanyId() == null) {
            throw AppException.forbidden("Only contractor company officers can view their properties");
        }
        return ResponseEntity.ok(ApiResponse.ok(
                invoiceService.getCompanyProperties(user.getContractorCompanyId())));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) return user;
        throw AppException.forbidden("Authenticated user is required");
    }
}
