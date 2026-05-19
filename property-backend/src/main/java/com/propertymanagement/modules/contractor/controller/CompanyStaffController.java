package com.propertymanagement.modules.contractor.controller;

import com.propertymanagement.modules.contractor.dto.CompanyOfficerCreateRequest;
import com.propertymanagement.modules.contractor.dto.CompanyOfficerResponse;
import com.propertymanagement.modules.contractor.dto.CompanyStaffPropertyResponse;
import com.propertymanagement.modules.contractor.service.CompanyStaffService;
import com.propertymanagement.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/company/my-staff")
@RequiredArgsConstructor
public class CompanyStaffController {

    private final CompanyStaffService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CompanyOfficerResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.listMyOfficers()));
    }

    @GetMapping("/properties")
    public ResponseEntity<ApiResponse<List<CompanyStaffPropertyResponse>>> properties() {
        return ResponseEntity.ok(ApiResponse.ok(service.listMyAssignableProperties()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CompanyOfficerResponse>> create(
            @Valid @RequestBody CompanyOfficerCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createOfficer(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyOfficerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CompanyOfficerCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateOfficer(id, request)));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<CompanyOfficerResponse>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.toggleActive(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long replacementOfficerId) {
        service.removeOfficer(id, replacementOfficerId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
