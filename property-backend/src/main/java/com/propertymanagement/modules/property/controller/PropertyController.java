package com.propertymanagement.modules.property.controller;

import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.property.dto.PropertyRevenueSplitResponse;
import com.propertymanagement.modules.property.dto.PropertyRequest;
import com.propertymanagement.modules.property.dto.PropertyResponse;
import com.propertymanagement.modules.ownerportal.service.OwnerRevenueQueryService;
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
import com.propertymanagement.modules.property.service.PropertyService;

import java.time.YearMonth;

@RestController
@RequestMapping("/properties")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;
    private final OwnerRevenueQueryService ownerRevenueQueryService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PropertyResponse>>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(propertyService.getAll(pageable, q, propertyId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PropertyResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(propertyService.getById(id)));
    }

    @GetMapping("/{id}/revenue-split")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PropertyRevenueSplitResponse>> revenueSplit(
            @PathVariable Long id,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        YearMonth period = (year != null && month != null)
                ? YearMonth.of(year, month)
                : YearMonth.now();
        return ResponseEntity.ok(ApiResponse.ok(
                ownerRevenueQueryService.propertyRevenueSplit(id, period.getYear(), period.getMonthValue())));
    }

    @PostMapping
    @RequiresPermission(module = "properties", action = "create")
    public ResponseEntity<ApiResponse<PropertyResponse>> create(@Valid @RequestBody PropertyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(propertyService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "properties", action = "edit")
    public ResponseEntity<ApiResponse<PropertyResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody PropertyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(propertyService.update(id, request)));
    }

    @PatchMapping("/{id}/toggle-active")
    @RequiresPermission(module = "properties", action = "toggle")
    public ResponseEntity<ApiResponse<PropertyResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(propertyService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "properties", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        propertyService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
