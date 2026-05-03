package com.propertymanagement.modules.tenant;

import com.propertymanagement.modules.tenant.dto.TenantFullOnboardRequest;
import com.propertymanagement.modules.tenant.dto.TenantOnboardingResponse;
import com.propertymanagement.modules.tenant.dto.TenantRequest;
import com.propertymanagement.modules.tenant.dto.TenantResponse;
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

@RestController
@RequestMapping("/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final TenantOnboardingService tenantOnboardingService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<Page<TenantResponse>>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getAll(pageable, q, propertyId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TenantResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getById(id)));
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<ApiResponse<TenantResponse>> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getByUserId(userId)));
    }

    @GetMapping("/by-unit/{unitId}")
    public ResponseEntity<ApiResponse<TenantResponse>> getByUnitId(@PathVariable Long unitId) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getByUnitId(unitId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<TenantResponse>> create(@Valid @RequestBody TenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tenantService.create(request)));
    }

    /**
     * Atomic admin onboarding: user + tenant + draft contract + unit marked rented in one transaction.
     */
    @PostMapping("/onboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<TenantOnboardingResponse>> onboard(
            @Valid @RequestBody TenantFullOnboardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tenantOnboardingService.onboard(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<TenantResponse>> update(
            @PathVariable Long id, @Valid @RequestBody TenantRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.update(id, request)));
    }

    @PatchMapping("/{id}/unlink-unit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<TenantResponse>> unlinkUnit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.unlinkUnit(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PROPERTY_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        tenantService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
