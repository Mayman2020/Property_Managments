package com.propertymanagement.modules.violation;

import com.propertymanagement.modules.violation.dto.ViolationRequest;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/violations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','PROPERTY_ADMIN','CONTRACTS_OFFICER')")
public class TenantViolationController {

    private final TenantViolationService violationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<TenantViolation>>> getAll(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(violationService.getAll(status, pageable)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<TenantViolation>>> getByTenant(@PathVariable Long tenantId) {
        return ResponseEntity.ok(ApiResponse.ok(violationService.getByTenant(tenantId)));
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<ApiResponse<List<TenantViolation>>> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(violationService.getByContract(contractId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TenantViolation>> create(
            @Valid @RequestBody ViolationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(violationService.create(request)));
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<TenantViolation>> resolve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String resolution = body != null ? body.get("resolution") : null;
        return ResponseEntity.ok(ApiResponse.ok(violationService.resolve(id, resolution)));
    }
}
