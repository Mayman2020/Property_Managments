package com.propertymanagement.modules.unit.controller;

import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.unit.dto.UnitRequest;
import com.propertymanagement.modules.unit.dto.UnitResponse;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.propertymanagement.modules.unit.service.UnitService;

@RestController
@RequestMapping("/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UnitResponse>>> getAll(
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) String unitType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                unitService.getAll(pageable, propertyId, q, floor, unitType, status, active)));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<Page<UnitResponse>>> getByProperty(
            @PathVariable Long propertyId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getByProperty(propertyId, pageable, q)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UnitResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(module = "units", action = "create")
    public ResponseEntity<ApiResponse<UnitResponse>> create(@Valid @RequestBody UnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(unitService.create(request)));
    }

    @PutMapping("/{id}")
    @RequiresPermission(module = "units", action = "edit")
    public ResponseEntity<ApiResponse<UnitResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UnitRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.update(id, request)));
    }

    @PatchMapping("/{id}/rental-status")
    @RequiresPermission(module = "units", action = "edit")
    public ResponseEntity<ApiResponse<UnitResponse>> setRentalStatus(
            @PathVariable Long id,
            @RequestParam boolean rented) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.setRentalStatus(id, rented)));
    }

    @PatchMapping("/{id}/toggle-active")
    @RequiresPermission(module = "units", action = "toggle")
    public ResponseEntity<ApiResponse<UnitResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(module = "units", action = "delete")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        unitService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
