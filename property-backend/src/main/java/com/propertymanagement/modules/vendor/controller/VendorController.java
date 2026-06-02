package com.propertymanagement.modules.vendor.controller;

import com.propertymanagement.modules.vendor.service.VendorService;
import com.propertymanagement.modules.vendor.dto.VendorRequestDTO;
import com.propertymanagement.modules.vendor.dto.VendorResponseDTO;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','PROCEDURES_CLERK')")
    public ResponseEntity<ApiResponse<Page<VendorResponseDTO>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long propertyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll(pageable, q, propertyId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT','PROCEDURES_CLERK')")
    public ResponseEntity<ApiResponse<VendorResponseDTO>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<VendorResponseDTO>> create(@Valid @RequestBody VendorRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.create(request)));
    }
}
