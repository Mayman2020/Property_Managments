package com.propertymanagement.modules.unit.controller;

import com.propertymanagement.modules.unit.dto.UnitRequest;
import com.propertymanagement.modules.unit.dto.UnitResponse;
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
import com.propertymanagement.modules.property.entity.Property;
import com.propertymanagement.modules.unit.entity.Unit;
import com.propertymanagement.modules.unit.service.UnitService;

@RestController
@RequestMapping("/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<ApiResponse<Page<UnitResponse>>> getByProperty(
            @PathVariable Long propertyId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getByProperty(propertyId, pageable, q)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UnitResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<UnitResponse>> create(@Valid @RequestBody UnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(unitService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<UnitResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UnitRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.update(id, request)));
    }

    /**
     * Re-syncs unit {@code is_rented} / {@code is_reserved} from lease contracts. Query {@code rented} is ignored.
     */
    @PatchMapping("/{id}/rental-status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<UnitResponse>> setRentalStatus(
            @PathVariable Long id,
            @RequestParam boolean rented) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.setRentalStatus(id, rented)));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<UnitResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(unitService.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        unitService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
