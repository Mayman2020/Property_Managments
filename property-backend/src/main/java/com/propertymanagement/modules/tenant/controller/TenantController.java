package com.propertymanagement.modules.tenant.controller;

import com.propertymanagement.modules.permission.annotation.RequiresPermission;
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
import org.springframework.web.bind.annotation.*;
import com.propertymanagement.modules.tenant.service.TenantOnboardingService;
import com.propertymanagement.modules.tenant.service.TenantService;

@RestController
@RequestMapping("/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final TenantOnboardingService tenantOnboardingService;

    @GetMapping
    @RequiresPermission(module = "tenants", action = "view")
    public ResponseEntity<ApiResponse<Page<TenantResponse>>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getAll(pageable, q, propertyId)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(module = "tenants", action = "view")
    public ResponseEntity<ApiResponse<TenantResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getById(id)));
    }

    @GetMapping("/by-user/{userId}")
    @RequiresPermission(module = "tenants", action = "view")
    public ResponseEntity<ApiResponse<TenantResponse>> getByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getByUserId(userId)));
    }

    @GetMapping("/by-unit/{unitId}")
    @RequiresPermission(module = "tenants", action = "view")
    public ResponseEntity<ApiResponse<TenantResponse>> getByUnitId(@PathVariable Long unitId) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getByUnitId(unitId)));
    }

    @PostMapping
    @RequiresPermission(module = "tenants", action = "create")
    public ResponseEntity<ApiResponse<TenantResponse>> create(@Valid @RequestBody TenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tenantService.create(request)));
    }

    @PostMapping("/onboard")
    @RequiresPermission(module = "tenants", action = "create")
    public ResponseEntity<ApiResponse<TenantOnboardingResponse>> onboard(
            @Valid @RequestBody TenantFullOnboardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tenantOnboardingService.onboard(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "tenants", action = "edit")
    public ResponseEntity<ApiResponse<TenantResponse>> update(
            @PathVariable Long id, @Valid @RequestBody TenantRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.update(id, request)));
    }

    @PatchMapping("/{id}/unlink-unit")
    @RequiresPermission(module = "tenants", action = "edit")
    public ResponseEntity<ApiResponse<TenantResponse>> unlinkUnit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.unlinkUnit(id)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "tenants", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        tenantService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
