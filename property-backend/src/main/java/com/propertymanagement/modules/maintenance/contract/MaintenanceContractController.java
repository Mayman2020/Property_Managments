package com.propertymanagement.modules.maintenance.contract;

import com.propertymanagement.modules.maintenance.contract.dto.MaintenanceContractResponse;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MaintenanceContractController {

    private final MaintenanceContractService service;

    /** GET /maintenance-contracts */
    @GetMapping("/maintenance-contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    /** GET /maintenance-contracts/{id} */
    @GetMapping("/maintenance-contracts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    /** GET /properties/{propertyId}/maintenance-contracts */
    @GetMapping("/properties/{propertyId}/maintenance-contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','MAINTENANCE_OFFICER','MAINTENANCE_CONTRACTOR')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listByProperty(
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByProperty(propertyId)));
    }

    /** GET /maintenance-companies/{companyId}/contracts */
    @GetMapping("/maintenance-companies/{companyId}/contracts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceContractResponse>>> listByCompany(
            @PathVariable Long companyId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listByCompany(companyId)));
    }

    /** PATCH /maintenance-contracts/{id}/activate */
    @PatchMapping("/maintenance-contracts/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(id)));
    }

    /** PATCH /maintenance-contracts/{id}/terminate */
    @PatchMapping("/maintenance-contracts/{id}/terminate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceContractResponse>> terminate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.terminate(id)));
    }
}
